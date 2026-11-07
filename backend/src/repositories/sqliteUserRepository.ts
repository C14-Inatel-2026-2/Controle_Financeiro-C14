import type { DatabaseSync } from "node:sqlite";
import type { Usuario } from "../models/user.js";
import { EmailAlreadyExistsError } from "../errors/userErrors.js";
import type { UserRepository } from "./userRepository.js";

export function createSqliteUserRepository(db: DatabaseSync): UserRepository {
  const buscar = db.prepare("SELECT id, nome, email FROM usuarios WHERE email = ?");
  const inserir = db.prepare(`
    INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)
    ON CONFLICT(email) DO NOTHING
  `);

  return {
    async buscarPorEmail(email) {
      return buscar.get(email) as Usuario | undefined;
    },
    async inserir({ nome, email, senha_hash }) {
      const resultado = inserir.run(nome, email, senha_hash);
      if (resultado.changes === 0) throw new EmailAlreadyExistsError();
      return Number(resultado.lastInsertRowid);
    },
  };
}
