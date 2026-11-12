import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { tratarErrosDaApi } from "../../src/middlewares/tratarErrosDaApi.js";

afterEach(() => vi.restoreAllMocks());

function prepararTeste() {
  const requisicao = {
    body: {
      nome: "Cristiano Ronaldo",
      email: "cristiano.ronaldo@example.test",
      senha: "senha-ficticia-do-teste",
      fatura: "dados-financeiros-ficticios",
    },
    headers: { cookie: "sessao=token-ficticio-do-teste" },
  } as Request;
  const resposta = {
    headersSent: false,
    status: vi.fn(),
    json: vi.fn(),
  };
  resposta.status.mockReturnValue(resposta);
  const next = vi.fn();
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  return { requisicao, resposta, next, log };
}

describe("tratarErrosDaApi", () => {
  it("responde 400 para JSON malformado, sem log nem encaminhamento do erro", () => {
    const { requisicao, resposta, next, log } = prepararTeste();
    const erro = Object.assign(new SyntaxError("Unexpected token"), {
      type: "entity.parse.failed",
    });

    tratarErrosDaApi(erro, requisicao, resposta, next);

    expect(resposta.status).toHaveBeenCalledExactlyOnceWith(400);
    expect(resposta.json).toHaveBeenCalledExactlyOnceWith({
      erro: {
        codigo: "INVALID_REQUEST_BODY",
        mensagem: "O corpo da requisição contém um JSON inválido.",
      },
    });
    expect(log).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it.each(["request.aborted", "request.size.invalid"])(
    "trata %s como entrada inválida, sem log",
    tipo => {
      const { requisicao, resposta, next, log } = prepararTeste();

      tratarErrosDaApi({ type: tipo }, requisicao, resposta, next);

      expect(resposta.status).toHaveBeenCalledExactlyOnceWith(400);
      expect(resposta.json).toHaveBeenCalledExactlyOnceWith({
        erro: {
          codigo: "INVALID_REQUEST_BODY",
          mensagem: "O corpo da requisição está incompleto ou possui tamanho inválido.",
        },
      });
      expect(log).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    },
  );

  it("responde 413 para corpo excessivo, sem log", () => {
    const { requisicao, resposta, next, log } = prepararTeste();

    tratarErrosDaApi({ type: "entity.too.large" }, requisicao, resposta, next);

    expect(resposta.status).toHaveBeenCalledExactlyOnceWith(413);
    expect(resposta.json).toHaveBeenCalledExactlyOnceWith({
      erro: {
        codigo: "REQUEST_BODY_TOO_LARGE",
        mensagem: "O corpo da requisição excede o limite permitido.",
      },
    });
    expect(log).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it.each(["charset.unsupported", "encoding.unsupported"])(
    "responde 415 para %s, sem log",
    tipo => {
      const { requisicao, resposta, next, log } = prepararTeste();

      tratarErrosDaApi({ type: tipo }, requisicao, resposta, next);

      expect(resposta.status).toHaveBeenCalledExactlyOnceWith(415);
      expect(resposta.json).toHaveBeenCalledExactlyOnceWith({
        erro: {
          codigo: "UNSUPPORTED_BODY_ENCODING",
          mensagem: "A codificação do corpo da requisição não é suportada.",
        },
      });
      expect(log).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    },
  );

  it.each([
    new Error("Falha interna na consulta SQL"),
    new SyntaxError("Defeito interno, sem identificação de erro do leitor JSON"),
  ])("responde 500 para %s e registra o evento uma única vez", erro => {
    const { requisicao, resposta, next, log } = prepararTeste();

    tratarErrosDaApi(erro, requisicao, resposta, next);

    expect(resposta.status).toHaveBeenCalledExactlyOnceWith(500);
    expect(resposta.json).toHaveBeenCalledExactlyOnceWith({
      erro: { codigo: "INTERNAL_ERROR", mensagem: "Não foi possível concluir a operação." },
    });
    expect(log).toHaveBeenCalledExactlyOnceWith(
      "[API] INTERNAL_ERROR: falha inesperada ao processar a requisição.",
    );
    expect(next).not.toHaveBeenCalled();
  });

  it.each([null, undefined, "falha", {}, { type: "desconhecido", status: 400 }])(
    "responde 500 sem quebrar ao receber um erro inesperado: %j",
    erro => {
      const { requisicao, resposta, next, log } = prepararTeste();

      tratarErrosDaApi(erro, requisicao, resposta, next);

      expect(resposta.status).toHaveBeenCalledExactlyOnceWith(500);
      expect(resposta.json).toHaveBeenCalledExactlyOnceWith({
        erro: { codigo: "INTERNAL_ERROR", mensagem: "Não foi possível concluir a operação." },
      });
      expect(log).toHaveBeenCalledTimes(1);
      expect(next).not.toHaveBeenCalled();
    },
  );

  it.each(["entity.parse.failed", "desconhecido"])(
    "não expõe dados da requisição ou do erro ao tratar %s",
    tipo => {
      const { requisicao, resposta, next, log } = prepararTeste();
      const dadosPrivados = JSON.stringify(requisicao);
      const erro = Object.assign(new Error(dadosPrivados), {
        type: tipo,
        body: requisicao.body,
        headers: requisicao.headers,
      });

      tratarErrosDaApi(erro, requisicao, resposta, next);

      const saidas = JSON.stringify([resposta.json.mock.calls, log.mock.calls]);
      for (const dado of [...Object.values(requisicao.body), requisicao.headers.cookie]) {
        expect(saidas).not.toContain(dado);
      }
      expect(saidas).not.toContain(erro.stack);
      expect(next).not.toHaveBeenCalled();
    },
  );

  it("encaminha o erro sem responder novamente quando os cabeçalhos já foram enviados", () => {
    const { requisicao, resposta, next, log } = prepararTeste();
    resposta.headersSent = true;
    const erro = new Error("Falha depois de iniciar a resposta");

    tratarErrosDaApi(erro, requisicao, resposta, next);

    expect(next).toHaveBeenCalledExactlyOnceWith(erro);
    expect(resposta.status).not.toHaveBeenCalled();
    expect(resposta.json).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
