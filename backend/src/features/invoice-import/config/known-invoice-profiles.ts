import type { InvoiceProfile } from "../domain/invoice-profile.js";
import { ItauPdfV1Profile } from "../infrastructure/profiles/itau/itau-pdf-v1-profile.js";

/**
 * Catálogo de profiles habilitados para bancos conhecidos.
 *
 * Participa somente do fluxo de upload associado a um banco selecionado. Um
 * profile passa a ser oferecido pela aplicação apenas após sua inclusão
 * explícita nesta lista. O catálogo atual contém somente Itaú PDF v1.
 */

export const KNOWN_INVOICE_PROFILES: readonly InvoiceProfile[] = [
  new ItauPdfV1Profile(),
];
