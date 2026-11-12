import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Usuario } from "../models/user.js";
import type { Credenciais } from "../repositories/credenciais.js";
import { CredenciaisInvalidasError, ValidationError } from "../errors/userErrors.js";
import { normalizarEmail } from "./normalizarEmail.js";

const derivarChave = promisify(scrypt);

// Usado quando o e-mail não existe, para a resposta demorar o mesmo que uma senha errada
// e não revelar quais e-mails estão cadastrados.
const HASH_FICTICIO = `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;

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

// Mesmo formato gravado pelo createUserService: scrypt:<salt>:<hash>.
async function senhaConfere(senha: string, senhaHash: string): Promise<boolean> {
  const [algoritmo, salt, hashHex] = senhaHash.split(":");
  if (algoritmo !== "scrypt" || !salt || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  if (esperado.length === 0) return false;
  const calculado = await derivarChave(senha, salt, esperado.length) as Buffer;
  return timingSafeEqual(calculado, esperado);
}

export async function loginService(corpo: unknown, buscar: BuscarCredenciais): Promise<Usuario> {
  const { email, senha } = lerDadosLogin(corpo);
  const credenciais = await buscar(normalizarEmail(email));
  const confere = await senhaConfere(senha, credenciais?.senha_hash ?? HASH_FICTICIO);
  if (!credenciais || !confere) throw new CredenciaisInvalidasError();
  return { id: credenciais.id, nome: credenciais.nome, email: credenciais.email };
}
