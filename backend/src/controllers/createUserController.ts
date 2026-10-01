import type { Request, Response } from "express";
import type { DadosCadastro, Usuario } from "../models/user.js";

import {
  ValidationError,
  EmailAlreadyExistsError,
} from "../errors/userErrors.js";

import { lerDadosCadastro } from "./lerDadosCadastro.js";

export type CriarUsuario = (
  dados: DadosCadastro,
) => Promise<Usuario>;

export function createUserController(criarUsuario: CriarUsuario) {
  return async function cadastrar(
    req: Pick<Request, "body">,
    res: Pick<Response, "status" | "json">,
  ): Promise<void> {
    try {
      const dados = lerDadosCadastro(req.body);

      const usuario = await criarUsuario(dados);

      res.status(201).json({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      });
    } catch (erro: unknown) {
      if (erro instanceof ValidationError) {
        res.status(400).json({
          erro: {
            codigo: "VALIDATION_ERROR",
            mensagem: erro.message,
            campo: erro.campo,
          },
        });
        return;
      }

      if (erro instanceof EmailAlreadyExistsError) {
        res.status(409).json({
          erro: {
            codigo: "EMAIL_ALREADY_EXISTS",
            mensagem: erro.message,
          },
        });
        return;
      }

      res.status(500).json({
        erro: {
          codigo: "INTERNAL_ERROR",
          mensagem: "Não foi possível concluir o cadastro.",
        },
      });
    }
  };
}