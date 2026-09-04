/**
 * Erros específicos do domínio de importação de faturas.
 *
 * Utilizados nos fluxos de bancos conhecidos e CSV manual. A distinção entre
 * falhas permite que as camadas externas convertam cada caso em uma resposta
 * adequada, sem depender da mensagem textual do erro.
 */

export class InvoiceParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceParseError";
  }
}

export class InvalidInvoiceFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInvoiceFileError";
  }
}

export class InvoicePasswordRequiredError extends Error {
  constructor() {
    super("A fatura PDF está protegida e requer uma senha");
    this.name = "InvoicePasswordRequiredError";
  }
}

export class InvalidInvoicePasswordError extends Error {
  constructor() {
    super("A senha informada para a fatura PDF está incorreta");
    this.name = "InvalidInvoicePasswordError";
  }
}

export class InvoiceTotalMismatchError extends Error {
  constructor(expectedInCents: number, actualInCents: number) {
    super(
      `A soma dos lançamentos (${actualInCents}) difere do total da fatura (${expectedInCents})`,
    );
    this.name = "InvoiceTotalMismatchError";
  }
}

export class UnsupportedInvoiceFormatError extends Error {
  constructor(fileName: string) {
    super(`Formato de fatura não suportado: ${fileName}`);
    this.name = "UnsupportedInvoiceFormatError";
  }
}

export class InvoiceExtractorNotConfiguredError extends Error {
  constructor(format: string) {
    super(`Não existe extrator configurado para o formato: ${format}`);
    this.name = "InvoiceExtractorNotConfiguredError";
  }
}

export class UnsupportedBankError extends Error {
  constructor(bankId: string) {
    super(`Banco não suportado: ${bankId}`);
    this.name = "UnsupportedBankError";
  }
}

export class UnsupportedBankFormatError extends Error {
  constructor(bankId: string, format: string) {
    super(`O banco ${bankId} não possui suporte ao formato ${format}`);
    this.name = "UnsupportedBankFormatError";
  }
}

export class UnknownInvoiceLayoutError extends Error {
  constructor(bankId: string, format: string) {
    super(`Layout ${format} desconhecido para o banco ${bankId}`);
    this.name = "UnknownInvoiceLayoutError";
  }
}

export class AmbiguousInvoiceLayoutError extends Error {
  constructor(bankId: string, format: string) {
    super(`Mais de um perfil reconheceu o layout ${format} do banco ${bankId}`);
    this.name = "AmbiguousInvoiceLayoutError";
  }
}
