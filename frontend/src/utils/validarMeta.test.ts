import { describe, expect, it } from "vitest";
import { validarMeta } from "./validarMeta";

describe("validarMeta", () => {
  it.each([["10,10", 1010], ["0.29", 29], ["1", 100], ["1,5", 150], ["90071992547409,91", Number.MAX_SAFE_INTEGER]])(
    "converte %s para centavos sem arredondar", (valor, centavos) => {
      expect(validarMeta(" Viagem ", valor as string)).toEqual({ name: "Viagem", targetAmountInCents: centavos });
    },
  );
  it.each(["", "0", "0,00", "-1", "1.001", "abc", "Infinity", "1e3", "90071992547409,92"])(
    "rejeita alvo inválido %s", (valor) => expect(() => validarMeta("Viagem", valor)).toThrow(),
  );
  it("exige nome", () => expect(() => validarMeta(" ", "10")).toThrow("nome"));
});
