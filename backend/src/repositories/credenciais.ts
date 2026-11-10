import type { DatabaseSync } from "node:sqlite";
import type { Usuario } from "../models/user.js";

export interface Credenciais extends Usuario {
  senha_hash: string;
}

// Consulta interna do login: senha_hash nunca deve sair numa resposta da API.
export function criarRepositorioCredenciais(db: DatabaseSync) {
  const porEmail = db.prepare("SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?");
  const porId = db.prepare("SELECT id, nome, email FROM usuarios WHERE id = ?");
  return {
    buscarPorEmail(email: string) {
      return porEmail.get(email) as Credenciais | undefined;
    },
    buscarPorId(id: number) {
      return porId.get(id) as Usuario | undefined;
    },
  };
}
