import { describe, expect, it } from "vitest";
import { calcularSaldo } from "../../src/services/calcularSaldo";

describe("calcularSaldo", () => {
  it("retorna zero quando não existem movimentações", () => {
    expect(calcularSaldo([])).toBe(0);
  });

  it("subtrai despesas das receitas", () => {
    const saldo = calcularSaldo([
      { tipo: "receita", valorEmCentavos: 10000 },
      { tipo: "despesa", valorEmCentavos: 3000 },
    ]);

    expect(saldo).toBe(7000);
  });
});