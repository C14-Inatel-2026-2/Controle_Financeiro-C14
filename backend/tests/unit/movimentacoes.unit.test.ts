import { describe, expect, it } from "vitest";
import { comandoInserirMovimentacao } from "../../src/repositories/movimentacoes";
import { validarValorEmCentavos } from "../../src/repositories/validarValorEmCentavos";

// Funções puras: montam o comando sem abrir banco. A execução real fica nos testes de integração.
describe("Comando de inserção de movimentações", () => {
  const movimento = { descricao: " Mercado ", tipo: "despesa" as const, valorEmCentavos: 3000, data: "2026-09-30" };
  const sqlCompacto = (sql: string) => sql.replace(/\s+/g, " ").trim();

  it("usa parâmetros, o dono informado e a descrição normalizada", () => {
    const comando = comandoInserirMovimentacao(7, movimento) as { sql: string; args: unknown[] };
    expect(sqlCompacto(comando.sql)).toBe(
      "INSERT INTO movimentacoes (usuario_id, descricao, tipo, valor_em_centavos, data) VALUES (?, ?, ?, ?, ?)",
    );
    expect(comando.args).toEqual([7, "Mercado", "despesa", 3000, "2026-09-30"]);
  });

  it("inclui a categoria quando informada", () => {
    const comando = comandoInserirMovimentacao(7, { ...movimento, categoriaId: 10 }) as { sql: string; args: unknown[] };
    expect(sqlCompacto(comando.sql)).toContain("data, categoria_id) VALUES (?, ?, ?, ?, ?, ?)");
    expect(comando.args).toEqual([7, "Mercado", "despesa", 3000, "2026-09-30", 10]);
  });

  it("rejeita descrição vazia e valor inválido antes de chegar ao banco", () => {
    expect(() => comandoInserirMovimentacao(7, { ...movimento, descricao: "  " })).toThrow();
    expect(() => comandoInserirMovimentacao(7, { ...movimento, valorEmCentavos: -1 })).toThrow();
  });
});

describe("Validação de valores — sem mock", () => {
  it("aceita um valor inteiro positivo em centavos", () => {
    expect(() => validarValorEmCentavos(3000)).not.toThrow();
  });

  it("rejeita um valor negativo com a mensagem esperada", () => {
    expect(() => validarValorEmCentavos(-100)).toThrow(
      "O valor deve ser um inteiro não negativo em centavos."
    );
  });
});
