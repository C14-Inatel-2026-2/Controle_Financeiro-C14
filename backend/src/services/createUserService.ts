import type { DadosCadastro, Usuario } from "../models/user.js";
import type { UserRepository } from "../repositories/userRepository.js";
import {
  ValidationError,
  EmailAlreadyExistsError,
} from "../errors/userErrors.js";
import { normalizarEmail } from "./normalizarEmail.js";
import { gerarHashDeSenha } from "./senhas.js";

const LIMITE_NOME_USUARIO = 100;

export async function createUserService(
  dados: DadosCadastro,
  repository: UserRepository,
): Promise<Usuario> {
  const nome = dados.nome.trim();
  if (nome === "") {
    throw new ValidationError("Informe seu nome.", "nome");
  }
  if (nome.length > LIMITE_NOME_USUARIO) {
    throw new ValidationError(`O nome deve ter no máximo ${LIMITE_NOME_USUARIO} caracteres.`, "nome");
  }

  const email = normalizarEmail(dados.email);
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError("Informe um e-mail válido.", "email");
  }

  if (dados.senha.length < 8) {
    throw new ValidationError("A senha deve ter pelo menos 8 caracteres.", "senha");
  }

  if (await repository.buscarPorEmail(email)) {
    throw new EmailAlreadyExistsError();
  }

  const senha_hash = await gerarHashDeSenha(dados.senha);
  const id = await repository.inserir({ nome, email, senha_hash });

  return { id, nome, email };
}
