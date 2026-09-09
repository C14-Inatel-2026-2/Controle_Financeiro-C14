export type Movimentacao = {
  tipo: "receita" | "despesa";
  valorEmCentavos: number;
};

export function calcularSaldo(movimentacoes: Movimentacao[]): number {
  let saldo = 0;

  for (const movimentacao of movimentacoes) {
    const { tipo, valorEmCentavos } = movimentacao;

    if (!Number.isSafeInteger(valorEmCentavos) || valorEmCentavos < 0) {
      throw new Error("O valor deve ser um inteiro não negativo em centavos.");
    }

    if (tipo === "receita") {
      saldo += valorEmCentavos;
    } else {
      saldo -= valorEmCentavos;
    }
  }

  return saldo;
}