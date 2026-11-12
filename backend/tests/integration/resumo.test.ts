import request from "supertest";
import { expect, it } from "vitest";
import { abrirBanco } from "../../src/database/conexao";
import { createAppComBanco } from "../../src/appComBanco";
import { criarRepositorioSessoes } from "../../src/repositories/sessoes";
import { mesAtual } from "../../src/services/resumo";

it("retorna 70 reais para uma conta e zero para a outra", async () => {
  const db = abrirBanco(":memory:");
  try {
    db.exec("INSERT INTO usuarios VALUES (1,'Ana','ana@example.test','hash'),(2,'Bia','bia@example.test','hash')");
    const api = request(createAppComBanco(db));
    const sessoes = criarRepositorioSessoes(db);
    const ana = "sessao=" + sessoes.criar(1).token;
    const bia = "sessao=" + sessoes.criar(2).token;
    const mes = mesAtual();
    await api.get("/api/resumo").expect(401);
    for (const [tipo, valorEmCentavos] of [["receita", 10000], ["despesa", 3000]]) {
      await api.post("/api/movimentacoes").set("Cookie", ana)
        .send({ descricao: "Teste", tipo, valorEmCentavos, data: mes + "-01" }).expect(201);
    }
    const resposta = await api.get("/api/resumo").set("Cookie", ana).expect(200);
    expect(resposta.body).toMatchObject({ saldoEmCentavos: 7000, receitasEmCentavos: 10000, despesasEmCentavos: 3000 });
    expect(resposta.body.ultimosLancamentos).toHaveLength(2);
    await api.get("/api/resumo?usuarioId=1").set("Cookie", bia).expect(200, {
      mes, saldoEmCentavos: 0, receitasEmCentavos: 0, despesasEmCentavos: 0, gastosPorCategoria: [], ultimosLancamentos: [],
    });
  } finally {
    db.close();
  }
});
