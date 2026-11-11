import type { NextFunction, Request, Response } from "express";

export function tratarErrosDaApi(
  erro: unknown,
  _req: Request,
  res: Pick<Response, "headersSent" | "status" | "json">,
  next: NextFunction,
): void {
  // Uma resposta iniciada não pode ser substituída por outra. O Express
  // recebe o erro para encerrar o fluxo sem enviar cabeçalhos novamente.
  if (res.headersSent) {
    next(erro);
    return;
  }

  // O identificador do leitor distingue JSON inválido de um SyntaxError
  // causado por um defeito interno. A mensagem do erro pode conter dados privados.
  const tipo = typeof erro === "object" && erro !== null && "type" in erro
    ? erro.type
    : undefined;

  let status = 500;
  let codigo = "INTERNAL_ERROR";
  let mensagem = "Não foi possível concluir a operação.";

  switch (tipo) {
    case "entity.parse.failed":
      status = 400;
      codigo = "INVALID_REQUEST_BODY";
      mensagem = "O corpo da requisição contém um JSON inválido.";
      break;
    case "request.aborted":
    case "request.size.invalid":
      status = 400;
      codigo = "INVALID_REQUEST_BODY";
      mensagem = "O corpo da requisição está incompleto ou possui tamanho inválido.";
      break;
    case "entity.too.large":
      status = 413;
      codigo = "REQUEST_BODY_TOO_LARGE";
      mensagem = "O corpo da requisição excede o limite permitido.";
      break;
    case "charset.unsupported":
    case "encoding.unsupported":
      status = 415;
      codigo = "UNSUPPORTED_BODY_ENCODING";
      mensagem = "A codificação do corpo da requisição não é suportada.";
      break;
  }

  if (status === 500) {
    // Registra o evento sem copiar erro, stack ou requisição: esses objetos
    // podem conter senhas, cookies e dados financeiros. Erros de entrada não geram log.
    console.error("[API] INTERNAL_ERROR: falha inesperada ao processar a requisição.");
  }

  res.status(status).json({ erro: { codigo, mensagem } });
}
