import { describe, expect, it, vi } from "vitest";

import {
  createUserController,
  type CriarUsuario,
} from "../../src/controllers/createUserController.js";

import {
  EmailAlreadyExistsError,
} from "../../src/errors/userErrors.js";

const dadosValidos = {
  nome: "Cristiano Ronaldo",
  email: "cristiano.ronaldo@example.test",
  senha: "Siuuu123!",
};

function prepararTeste() {
  const criarUsuario = vi.fn<CriarUsuario>();

  const resposta = {
    status: vi.fn(),
    json: vi.fn(),
  };

  resposta.status.mockReturnValue(resposta);

  const controller = createUserController(criarUsuario);

  return { controller, criarUsuario, resposta };
}

describe("createUserController", () => {
  it("chama o cadastro e responde 201 com os dados públicos", async () => {
    const { controller, criarUsuario, resposta } = prepararTeste();

    const usuarioCriado = {
      id: 7,
      nome: dadosValidos.nome,
      email: dadosValidos.email,
    };

    criarUsuario.mockResolvedValue(usuarioCriado);

    await controller({ body: dadosValidos }, resposta);

    expect(criarUsuario).toHaveBeenCalledTimes(1);
    expect(criarUsuario).toHaveBeenCalledWith(dadosValidos);

    expect(resposta.status).toHaveBeenCalledWith(201);
    expect(resposta.json).toHaveBeenCalledWith(usuarioCriado);
  });

  it("responde 409 quando o e-mail já está cadastrado", async () => {
    const { controller, criarUsuario, resposta } = prepararTeste();

    criarUsuario.mockRejectedValue(
      new EmailAlreadyExistsError(),
    );

    await controller({ body: dadosValidos }, resposta);

    expect(criarUsuario).toHaveBeenCalledTimes(1);
    expect(resposta.status).toHaveBeenCalledWith(409);
    expect(resposta.json).toHaveBeenCalledWith({
      erro: {
        codigo: "EMAIL_ALREADY_EXISTS",
        mensagem: "E-mail já cadastrado.",
      },
    });
  });

  it("responde 400 para entrada inválida sem chamar o cadastro", async () => {
    const { controller, criarUsuario, resposta } = prepararTeste();

    const entradaInvalida = {
      ...dadosValidos,
      senha: 12345678,
    };

    await controller({ body: entradaInvalida }, resposta);

    expect(criarUsuario).not.toHaveBeenCalled();
    expect(resposta.status).toHaveBeenCalledWith(400);
    expect(resposta.json).toHaveBeenCalledWith({
      erro: {
        codigo: "VALIDATION_ERROR",
        mensagem: "A senha deve ser informada como texto.",
        campo: "senha",
      },
    });
  });

  it("responde 500 sem expor detalhes de uma falha inesperada", async () => {
    const { controller, criarUsuario, resposta } = prepararTeste();

    criarUsuario.mockRejectedValue(
      new Error("Falha interna ao executar consulta SQL."),
    );

    await controller({ body: dadosValidos }, resposta);

    expect(resposta.status).toHaveBeenCalledWith(500);
    expect(resposta.json).toHaveBeenCalledWith({
      erro: {
        codigo: "INTERNAL_ERROR",
        mensagem: "Não foi possível concluir o cadastro.",
      },
    });
  });
});