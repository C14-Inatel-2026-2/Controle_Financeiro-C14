import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Formato gravado em usuarios.senha_hash: scrypt:<salt>:<hash>, com salt de 16 bytes
// e hash de 64 bytes, ambos em hexadecimal. Mudar o formato invalida as contas existentes.
const derivarChave = promisify(scrypt);

// Usado quando o e-mail não existe, para a resposta demorar o mesmo que uma senha errada
// e não revelar quais e-mails estão cadastrados.
export const HASH_FICTICIO = `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;

export async function gerarHashDeSenha(senha: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await derivarChave(senha, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}

export async function senhaConfere(senha: string, senhaHash: string): Promise<boolean> {
  const [algoritmo, salt, hashHex] = senhaHash.split(":");
  if (algoritmo !== "scrypt" || !salt || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  if (esperado.length === 0) return false;
  const calculado = await derivarChave(senha, salt, esperado.length) as Buffer;
  return timingSafeEqual(calculado, esperado);
}
