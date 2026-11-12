import type { Banco } from "../database/conexao.js";
import type { Usuario } from "../models/user.js";
import { EmailAlreadyExistsError } from "../errors/userErrors.js";
import type { UserRepository } from "./userRepository.js";

export function createSqliteUserRepository(db: Banco): UserRepository {
  return {
    async buscarPorEmail(email) {
      const { rows } = await db.execute({ sql: "SELECT id, nome, email FROM usuarios WHERE email = ?", args: [email] });
      return rows[0] as unknown as Usuario | undefined;
    },
    async inserir({ nome, email, senha_hash }) {
      const resultado = await db.execute({
        sql: `INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)
          ON CONFLICT(email) DO NOTHING`,
        args: [nome, email, senha_hash],
      });
      if (resultado.rowsAffected === 0) throw new EmailAlreadyExistsError();
      return Number(resultado.lastInsertRowid);
    },
  };
}
