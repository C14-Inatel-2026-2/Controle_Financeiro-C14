import {
  AmbiguousInvoiceLayoutError,
  UnknownInvoiceLayoutError,
  UnsupportedBankError,
  UnsupportedBankFormatError,
} from "./invoice-errors.js";
import type { ExtractedInvoiceData } from "./invoice-extractor.js";
import type { InvoiceProfile } from "./invoice-profile.js";
import type { InvoiceFormat, KnownBankOption } from "./invoice.js";

/**
 * Catálogo e seletor de profiles de bancos conhecidos.
 *
 * Não participa do CSV manual. Valida banco e formato antes da extração e,
 * após a extração, seleciona a versão de layout compatível com os dados.
 */

export class InvoiceProfileRegistry {
  constructor(private readonly profiles: readonly InvoiceProfile[]) {}

  listKnownBanks(availableFormats: readonly InvoiceFormat[]): KnownBankOption[] {
    const formats = new Set(availableFormats);
    const banks = new Map<string, KnownBankOption>();

    for (const profile of this.profiles) {
      if (!formats.has(profile.format)) {
        continue;
      }

      const bank = banks.get(profile.bankId) ?? {
        id: profile.bankId,
        name: profile.bankName,
        formats: [],
      };

      if (!bank.formats.includes(profile.format)) {
        bank.formats.push(profile.format);
      }

      banks.set(profile.bankId, bank);
    }

    return [...banks.values()]
      .map((bank) => ({ ...bank, formats: [...bank.formats].sort() }))
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  }

  /** Confirma que o identificador pertence a um banco cadastrado. */
  assertKnownBank(bankId: string): void {
    if (!this.profiles.some((profile) => profile.bankId === bankId)) {
      throw new UnsupportedBankError(bankId);
    }
  }

  /** Confirma que o banco possui ao menos um profile para o formato. */
  assertSupportedFormat(bankId: string, format: InvoiceFormat): void {
    this.assertKnownBank(bankId);

    const supportsFormat = this.profiles.some(
      (profile) => profile.bankId === bankId && profile.format === format,
    );

    if (!supportsFormat) {
      throw new UnsupportedBankFormatError(bankId, format);
    }
  }

  resolve(bankId: string, data: ExtractedInvoiceData): InvoiceProfile {
    // Repete a validação para preservar a segurança do registry quando ele é
    // chamado diretamente, fora do serviço de aplicação.
    this.assertSupportedFormat(bankId, data.format);

    const bankProfiles = this.profiles.filter(
      (profile) => profile.bankId === bankId,
    );

    const formatProfiles = bankProfiles.filter(
      (profile) => profile.format === data.format,
    );

    const matchingProfiles = formatProfiles
      .filter((profile) => profile.matches(data))
      .sort((first, second) => second.priority - first.priority);

    if (matchingProfiles.length === 0) {
      throw new UnknownInvoiceLayoutError(bankId, data.format);
    }

    const [selectedProfile, secondProfile] = matchingProfiles;

    // O empate impediria uma escolha determinística entre duas versões.
    if (secondProfile && secondProfile.priority === selectedProfile.priority) {
      throw new AmbiguousInvoiceLayoutError(bankId, data.format);
    }

    return selectedProfile;
  }
}
