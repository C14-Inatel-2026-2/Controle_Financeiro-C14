import { Router } from "express";
import {
  createUserController,
  type CriarUsuario,
} from "../controllers/createUserController.js";

export function createUserRouter(criarUsuario: CriarUsuario) {
  const router = Router();
  const cadastrar = createUserController(criarUsuario);

  router.post("/", cadastrar);

  return router;
}
