import { Router } from "express";
import { exigirSessao } from "../middlewares/sessao.js";
import { CategoriaIndisponivel, type criarRepositorioMovimentacoes, type NovaMovimentacao } from "../repositories/movimentacoes.js";

export type RepositorioMovimentacoes = ReturnType<typeof criarRepositorioMovimentacoes>;

function dadosValidos(body: Partial<NovaMovimentacao> | null | undefined): body is NovaMovimentacao {
  if (!body || typeof body.descricao !== "string" || !body.descricao.trim()) return false;
  if (body.tipo !== "receita" && body.tipo !== "despesa") return false;
  if (typeof body.valorEmCentavos !== "number" || !Number.isSafeInteger(body.valorEmCentavos) || body.valorEmCentavos < 0) return false;
  if (body.categoriaId != null && (!Number.isSafeInteger(body.categoriaId) || body.categoriaId <= 0)) return false;
  if (typeof body.data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.data)) return false;
  const data = new Date(body.data + "T00:00:00Z");
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === body.data;
}

export function criarRouterMovimentacoes(repo: RepositorioMovimentacoes) {
  const router = Router();
  router.use(exigirSessao);
  router.get("/", (req, res) => {
    res.json(repo.listar(req.usuario!.id));
  });
  router.post("/", (req, res) => {
    if (!dadosValidos(req.body)) {
      res.status(400).json({ erro: { codigo: "VALIDATION_ERROR", mensagem: "Dados da movimentação inválidos." } });
      return;
    }
    try {
      const id = repo.inserir(req.usuario!.id, req.body);
      res.status(201).json({ id });
    } catch (erro) {
      if (!(erro instanceof CategoriaIndisponivel)) throw erro;
      res.status(404).json({ erro: { codigo: "CATEGORY_NOT_FOUND", mensagem: erro.message } });
    }
  });
  return router;
}
