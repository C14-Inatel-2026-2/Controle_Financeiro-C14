import { describe, expect, it } from "vitest";
import { centavosDeReais } from "./centavosDeReais";

describe("Reais para centavos exatos", () => {
  it.each([["0,01", 1], ["0.29", 29], ["10,1", 1010], [" 123,45 ", 12345], ["90071992547409,91", Number.MAX_SAFE_INTEGER]])("converte %s", (texto, esperado) => {
    expect(centavosDeReais(texto as string)).toBe(esperado);
  });
  it.each(["", "0", "-1", "1,234", "1.234,56", "abc", "1e3", "Infinity", "90071992547409,92"])("recusa %s", valor => {
    expect(() => centavosDeReais(valor)).toThrow();
  });
});
