import { describe, expect, it, vi } from "vitest";
import request from "supertest";

import { createApp } from "../../src/app.js";
import type { CriarUsuario } from "../../src/controllers/createUserController.js";
import { EmailAlreadyExistsError } from "../../src/errors/userErrors.js";

// Integração HTTP: Express, express.json, rota /users e controller reais.
// O serviço de cadastro é simulado para controlar os cenários; estes testes
// não comprovam persistência em SQLite.

const dadosValidos = {
  nome: "Cristiano Ronaldo",
  email: "cristiano.ronaldo@example.test",
  senha: "Siuuu123!",
};

function prepararApp() {
  const criarUsuario = vi.fn<CriarUsuario>();
  const app = createApp(criarUsuario);

  return { app, criarUsuario };
}

describe("POST /users sem serviço de cadastro configurado", () => {
  it("responde 503 com USER_REGISTRATION_UNAVAILABLE", async () => {
    const resposta = await request(createApp())
      .post("/users")
      .send(dadosValidos);

    expect(resposta.status).toBe(503);
    expect(resposta.body).toEqual({
      erro: {
        codigo: "USER_REGISTRATION_UNAVAILABLE",
        mensagem: "Cadastro de usuários indisponível.",
      },
    });
  });
});

describe("POST /users com serviço de cadastro configurado", () => {
  it("responde 201 somente com os campos públicos do usuário criado", async () => {
    const { app, criarUsuario } = prepararApp();

    // Retorno com campo sensível fictício para garantir que ele não vaza.
    const usuarioRetornado = {
      id: 7,
      nome: dadosValidos.nome,
      email: dadosValidos.email,
      senha_hash: "scrypt:salt-ficticio:hash-ficticio",
    };
    criarUsuario.mockResolvedValue(usuarioRetornado);

    const resposta = await request(app).post("/users").send(dadosValidos);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({
      id: 7,
      nome: dadosValidos.nome,
      email: dadosValidos.email,
    });
    expect(resposta.body).not.toHaveProperty("senha_hash");
    expect(resposta.body).not.toHaveProperty("senha");

    expect(criarUsuario).toHaveBeenCalledTimes(1);
    expect(criarUsuario).toHaveBeenCalledWith(dadosValidos);
  });

  it.each([
    {
      caso: "requisição sem corpo",
      corpo: undefined,
      erroEsperado: {
        codigo: "VALIDATION_ERROR",
        mensagem: "O corpo da requisição deve ser um objeto.",
      },
    },
    {
      caso: "objeto vazio",
      corpo: {},
      erroEsperado: {
        codigo: "VALIDATION_ERROR",
        mensagem: "O nome deve ser informado como texto.",
        campo: "nome",
      },
    },
    {
      caso: "e-mail com tipo incorreto",
      corpo: { ...dadosValidos, email: 123 },
      erroEsperado: {
        codigo: "VALIDATION_ERROR",
        mensagem: "O e-mail deve ser informado como texto.",
        campo: "email",
      },
    },
  ])(
    "responde 400 sem chamar o serviço para $caso",
    async ({ corpo, erroEsperado }) => {
      const { app, criarUsuario } = prepararApp();

      const requisicao = request(app).post("/users");
      const resposta = corpo === undefined
        ? await requisicao
        : await requisicao.send(corpo);

      expect(resposta.status).toBe(400);
      expect(resposta.body).toEqual({ erro: erroEsperado });
      expect(criarUsuario).not.toHaveBeenCalled();
    },
  );

  it("responde 409 quando o serviço informa e-mail duplicado", async () => {
    const { app, criarUsuario } = prepararApp();
    criarUsuario.mockRejectedValue(new EmailAlreadyExistsError());

    const resposta = await request(app).post("/users").send(dadosValidos);

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({
      erro: {
        codigo: "EMAIL_ALREADY_EXISTS",
        mensagem: "E-mail já cadastrado.",
      },
    });
    expect(criarUsuario).toHaveBeenCalledTimes(1);
  });

  it("responde 500 com mensagem pública sem expor o erro interno", async () => {
    const { app, criarUsuario } = prepararApp();
    const mensagemInterna = "Falha fictícia: SQLITE_BUSY em usuarios.db";
    criarUsuario.mockRejectedValue(new Error(mensagemInterna));

    const resposta = await request(app).post("/users").send(dadosValidos);

    expect(resposta.status).toBe(500);
    expect(resposta.body).toEqual({
      erro: {
        codigo: "INTERNAL_ERROR",
        mensagem: "Não foi possível concluir o cadastro.",
      },
    });
    expect(resposta.text).not.toContain(mensagemInterna);
    expect(criarUsuario).toHaveBeenCalledTimes(1);
  });
});
