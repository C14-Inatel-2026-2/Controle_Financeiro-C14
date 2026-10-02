/** Valida o valor antes de enviar uma movimentação ao banco. */
export function validarValorEmCentavos(valor: number): void {
  if (!Number.isSafeInteger(valor) || valor < 0) {
    throw new Error("O valor deve ser um inteiro não negativo em centavos.");
  }
}
