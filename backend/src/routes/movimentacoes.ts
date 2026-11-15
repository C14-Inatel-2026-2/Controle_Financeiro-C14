import { Router } from "express";
import { exigirSessao } from "../middlewares/sessao.js";
import { ValidationError } from "../errors/userErrors.js";
import type { criarRepositorioMovimentacoes } from "../repositories/movimentacoes.js";
import { dadosMovimentacaoValidos } from "../services/validarDadosMovimentacao.js";

export type RepositorioMovimentacoes = ReturnType<typeof criarRepositorioMovimentacoes>;

export function criarRouterMovimentacoes(repo: RepositorioMovimentacoes) {
  const router = Router();
  router.use(exigirSessao);
  router.get("/", async (req, res) => {
    res.json(await repo.listar(req.usuario!.id));
  });
  router.post("/", async (req, res) => {
    if (!dadosMovimentacaoValidos(req.body)) {
      res.status(400).json({ erro: { codigo: "VALIDATION_ERROR", mensagem: "Dados da movimentação inválidos." } });
      return;
    }
    try {
      const id = await repo.inserir(req.usuario!.id, req.body);
      res.status(201).json({ id });
    } catch (erro) {
      if (erro instanceof ValidationError && erro.campo === "descricao") {
        res.status(400).json({ erro: { codigo: "VALIDATION_ERROR", mensagem: erro.message, campo: erro.campo } });
        return;
      }
      if (!(erro instanceof ValidationError) || erro.campo !== "categoriaId") throw erro;
      res.status(404).json({ erro: { codigo: "CATEGORY_NOT_FOUND", mensagem: erro.message } });
    }
  });
  return router;
}
