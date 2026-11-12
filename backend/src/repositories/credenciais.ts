import type { Banco } from "../database/conexao.js";
import type { Usuario } from "../models/user.js";

export interface Credenciais extends Usuario {
  senha_hash: string;
}

// Consulta interna do login: senha_hash nunca deve sair numa resposta da API.
export function criarRepositorioCredenciais(db: Banco) {
  return {
    async buscarPorEmail(email: string) {
      const { rows } = await db.execute({ sql: "SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?", args: [email] });
      return rows[0] as unknown as Credenciais | undefined;
    },
    async buscarPorId(id: number) {
      const { rows } = await db.execute({ sql: "SELECT id, nome, email FROM usuarios WHERE id = ?", args: [id] });
      return rows[0] as unknown as Usuario | undefined;
    },
  };
}
