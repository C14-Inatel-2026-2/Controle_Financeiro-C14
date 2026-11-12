import { Router, type CookieOptions } from "express";
import { CredenciaisInvalidasError, ValidationError } from "../errors/userErrors.js";
import { loginService } from "../services/loginService.js";
import type { criarRepositorioCredenciais } from "../repositories/credenciais.js";
import type { RepositorioSessoes } from "../repositories/sessoes.js";
import { exigirSessao, lerTokenDoCookie, NOME_COOKIE } from "../middlewares/sessao.js";

export interface Autenticacao {
  credenciais: ReturnType<typeof criarRepositorioCredenciais>;
  sessoes: RepositorioSessoes;
  cookieSeguro: boolean;
}

export function createAuthRouter({ credenciais, sessoes, cookieSeguro }: Autenticacao) {
  const router = Router();
  // Lax: o navegador não envia o cookie em POST vindo de outro site.
  const opcoesCookie: CookieOptions = { httpOnly: true, sameSite: "lax", secure: cookieSeguro, path: "/" };

  router.post("/login", async (req, res) => {
    try {
      const usuario = await loginService(req.body, credenciais.buscarPorEmail);
      const { token, expiraEm } = await sessoes.criar(usuario.id);
      res.cookie(NOME_COOKIE, token, { ...opcoesCookie, expires: new Date(expiraEm) });
      res.status(200).json(usuario);
    } catch (erro) {
      if (erro instanceof ValidationError) {
        res.status(400).json({ erro: { codigo: "VALIDATION_ERROR", mensagem: erro.message, campo: erro.campo } });
      } else if (erro instanceof CredenciaisInvalidasError) {
        res.status(401).json({ erro: { codigo: "INVALID_CREDENTIALS", mensagem: erro.message } });
      } else {
        res.status(500).json({ erro: { codigo: "INTERNAL_ERROR", mensagem: "Não foi possível entrar." } });
      }
    }
  });

  router.post("/logout", async (req, res) => {
    try {
      const token = lerTokenDoCookie(req.headers.cookie);
      if (token) await sessoes.remover(token);
      res.clearCookie(NOME_COOKIE, opcoesCookie);
      res.status(204).end();
    } catch {
      res.status(500).json({ erro: { codigo: "INTERNAL_ERROR", mensagem: "Não foi possível sair." } });
    }
  });

  router.get("/me", exigirSessao, async (req, res) => {
    const usuario = await credenciais.buscarPorId(req.usuario!.id);
    if (!usuario) {
      res.status(401).json({ erro: { codigo: "AUTHENTICATION_REQUIRED", mensagem: "Faça login para continuar." } });
      return;
    }
    res.json(usuario);
  });

  return router;
}
