import { Router, type Response } from "express";
import { CategoryAlreadyExistsError, createCategoryService } from "../features/categories/application/create-category-service.js";
import { InvalidCategoryNameError } from "../features/categories/domain/category.js";
import type { CategoryCatalog } from "../features/categories/domain/category-repository.js";
import { exigirSessao } from "../middlewares/sessao.js";

export type CategoriasDoUsuario = (usuarioId: number) => CategoryCatalog;

function respondError(res: Response, error: unknown) {
  const invalid = error instanceof InvalidCategoryNameError;
  const duplicate = error instanceof CategoryAlreadyExistsError;
  res.status(invalid ? 400 : duplicate ? 409 : 500).json({
    erro: {
      codigo: invalid ? "VALIDATION_ERROR" : duplicate ? "CATEGORY_ALREADY_EXISTS" : "INTERNAL_ERROR",
      mensagem: invalid || duplicate ? error.message : "Não foi possível concluir a operação de categorias.",
    },
  });
}

export function createCategoryRouter(categoriasDoUsuario: CategoriasDoUsuario) {
  const router = Router();
  router.use(exigirSessao);
  router.get("/", async (req, res) => {
    try {
      res.json(await categoriasDoUsuario(req.usuario!.id).list());
    } catch (error) {
      respondError(res, error);
    }
  });
  router.post("/", async (req, res) => {
    try {
      const repository = categoriasDoUsuario(req.usuario!.id);
      const category = await createCategoryService(req.body?.name, repository);
      res.status(201).json(await repository.findByName(category.name));
    } catch (error) {
      respondError(res, error);
    }
  });
  return router;
}
