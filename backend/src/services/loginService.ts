import type { Usuario } from "../models/user.js";
import type { Credenciais } from "../repositories/credenciais.js";
import { CredenciaisInvalidasError, ValidationError } from "../errors/userErrors.js";
import { normalizarEmail } from "./normalizarEmail.js";
import { HASH_FICTICIO, senhaConfere } from "./senhas.js";

export type BuscarCredenciais = (email: string) => Promise<Credenciais | undefined>;

export function lerDadosLogin(corpo: unknown): { email: string; senha: string } {
  if (typeof corpo !== "object" || corpo === null || Array.isArray(corpo)) {
    throw new ValidationError("O corpo da requisição deve ser um objeto.");
  }
  if (!("email" in corpo) || typeof corpo.email !== "string" || corpo.email.trim() === "") {
    throw new ValidationError("Informe o e-mail.", "email");
  }
  if (!("senha" in corpo) || typeof corpo.senha !== "string" || corpo.senha === "") {
    throw new ValidationError("Informe a senha.", "senha");
  }
  return { email: corpo.email, senha: corpo.senha };
}

export async function loginService(corpo: unknown, buscar: BuscarCredenciais): Promise<Usuario> {
  const { email, senha } = lerDadosLogin(corpo);
  const credenciais = await buscar(normalizarEmail(email));
  // Sem conta, compara com o hash fictício para não revelar quais e-mails estão cadastrados.
  const confere = await senhaConfere(senha, credenciais?.senha_hash ?? HASH_FICTICIO);
  if (!credenciais || !confere) throw new CredenciaisInvalidasError();
  return { id: credenciais.id, nome: credenciais.nome, email: credenciais.email };
}
