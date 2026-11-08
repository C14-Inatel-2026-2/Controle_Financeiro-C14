import { Router, json, type ErrorRequestHandler } from "express";
import { createInvoiceController, type InvoiceIdentity } from "../controllers/createInvoiceController.js";
import type { InvoiceImportWorkflow } from "../features/invoice-import/application/invoice-import-workflow.js";

export function createInvoiceRouter(workflow: InvoiceImportWorkflow, identity?: InvoiceIdentity) {
  const router = Router();
  const controller = createInvoiceController(workflow, identity);
  // Base64 aumenta o tamanho do PDF. O limite por arquivo é conferido antes da leitura.
  router.use(json({ limit: "8mb" }));
  router.get("/options", controller.options);
  router.post("/preview", controller.preview);
  router.post("/confirm", controller.confirm);
  const bodyError: ErrorRequestHandler = (error, _req, res, next) => {
    if (error?.type === "entity.too.large" || error?.type === "entity.parse.failed") {
      res.status(error.type === "entity.too.large" ? 413 : 400).json({
        erro: { codigo: "INVALID_REQUEST_BODY", mensagem: "JSON inválido ou requisição maior que 8 MiB." },
      });
      return;
    }
    next(error);
  };
  router.use(bodyError);
  return router;
}
