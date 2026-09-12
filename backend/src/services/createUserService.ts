import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import type { DadosCadastro, Usuario } from "../models/user.js";
import type { UserRepository } from "../repositories/userRepository.js";

const derivarChave = promisify(scrypt);

export async function createUserService(
  dados: DadosCadastro,
  repository: UserRepository,
): Promise<Usuario> {
  const nome = dados.nome.trim();
  if (nome === "") throw new Error("Informe seu nome.");

  // SQLite NOCASE compara letras ASCII sem diferenciar maiúsculas/minúsculas.
  const email = dados.email.trim().replace(/[A-Z]/g, (letra) => letra.toLowerCase());
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Informe um e-mail válido.");
  }

  if (dados.senha.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }

  if (await repository.buscarPorEmail(email)) {
    throw new Error("E-mail já cadastrado.");
  }

  const salt = randomBytes(16).toString("hex");
  const hash = await derivarChave(dados.senha, salt, 64) as Buffer;
  const senha_hash = `scrypt:${salt}:${hash.toString("hex")}`;
  const id = await repository.inserir({ nome, email, senha_hash });

  return { id, nome, email };
}
