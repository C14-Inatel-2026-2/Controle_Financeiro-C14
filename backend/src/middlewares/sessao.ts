import type { RequestHandler } from "express";
import type { RepositorioSessoes } from "../repositories/sessoes.js";

// Contrato da identidade autenticada: as rotas protegidas leem req.usuario.id.
// Esse ID vem sempre da sessão, nunca do corpo, da URL ou de um cabeçalho do cliente.
declare global {
  namespace Express {
    interface Request {
      usuario?: { id: number };
    }
  }
}

export const NOME_COOKIE = "sessao";

export function lerTokenDoCookie(cabecalho: string | undefined): string | undefined {
  for (const parte of (cabecalho ?? "").split(";")) {
    const [nome, ...valor] = parte.trim().split("=");
    if (nome === NOME_COOKIE && valor.length > 0) return valor.join("=");
  }
  return undefined;
}

// Roda em todas as requisições e só preenche req.usuario quando a sessão é válida.
export function carregarSessao(sessoes: Pick<RepositorioSessoes, "buscarUsuarioId">): RequestHandler {
  return (req, _res, next) => {
    try {
      const token = lerTokenDoCookie(req.headers.cookie);
      const usuarioId = token ? sessoes.buscarUsuarioId(token) : undefined;
      if (usuarioId) req.usuario = { id: usuarioId };
      next();
    } catch (erro) {
      next(erro);
    }
  };
}

// Colocar antes das rotas que exigem login: sem sessão válida responde 401.
export const exigirSessao: RequestHandler = (req, res, next) => {
  if (!req.usuario) {
    res.status(401).json({
      erro: { codigo: "AUTHENTICATION_REQUIRED", mensagem: "Faça login para continuar." },
    });
    return;
  }
  next();
};
