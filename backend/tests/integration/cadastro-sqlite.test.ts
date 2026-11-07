import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import request from "supertest";
import { createAppComBanco } from "../../src/appComBanco.js";
import { abrirBanco } from "../../src/database/conexao.js";

it("persiste o cadastro após reabrir o SQLite e rejeita email duplicado", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "cadastro-sqlite-"));
  const arquivo = join(pasta, "teste.sqlite");
  const dados = { nome: "Ana", email: "ANA@example.test", senha: "senha-de-teste" };
  try {
    const db = abrirBanco(arquivo);
    try {
      const resposta = await request(createAppComBanco(db)).post("/users").send(dados);
      expect(resposta.status).toBe(201);
      expect(resposta.body).toEqual({ id: 1, nome: "Ana", email: "ana@example.test" });
    } finally {
      db.close();
    }

    const reaberto = abrirBanco(arquivo);
    try {
      const registro = reaberto.prepare("SELECT senha_hash FROM usuarios WHERE id = 1").get();
      expect(registro?.senha_hash).toMatch(/^scrypt:[a-f0-9]+:[a-f0-9]+$/);
      const repetida = await request(createAppComBanco(reaberto)).post("/users")
        .send({ ...dados, email: "ana@example.test" });
      expect(repetida.status).toBe(409);
      expect(repetida.body.erro.codigo).toBe("EMAIL_ALREADY_EXISTS");
    } finally {
      reaberto.close();
    }
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
