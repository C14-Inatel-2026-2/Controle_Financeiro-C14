import { describe, expect, it } from "vitest";

import { parseAmountInCents } from "../../../src/features/invoice-import/domain/invoice-field-parsers.js";
import { InvoiceParseError } from "../../../src/features/invoice-import/domain/invoice-errors.js";

describe("parseAmountInCents", () => {
  it.each([
    { entrada: "125,90", esperado: 12590 },
    { entrada: "1.234,56", esperado: 123456 },
    { entrada: "-20,00", esperado: -2000 },
    { entrada: "(10,50)", esperado: -1050 },
    { entrada: "0,00", esperado: 0 },
  ])(
    "converte $entrada para $esperado centavos",
    ({ entrada, esperado }) => {
      const resultado = parseAmountInCents(entrada, 2, "pt-BR");

      expect(resultado).toBe(esperado);
    },
  );

  it.each([
    "",
    "   ",
    "abc",
    "abc123",
    "12abc34",
    "R$",
    "1.2.3",
    "12,34,56",
  ])("rejeita o valor inválido %j", (entrada) => {
    expect(() => {
      parseAmountInCents(entrada, 2, "pt-BR");
    }).toThrow(InvoiceParseError);
  });

  it("informa a linha que contém o valor inválido", () => {
    expect(() => {
      parseAmountInCents("abc", 7, "pt-BR");
    }).toThrow("Valor inválido na linha 7");
  });
});