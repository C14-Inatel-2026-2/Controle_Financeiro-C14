import type { NovoUsuario, Usuario } from "../models/user.js";

export interface UserRepository {
  // A comparação deve respeitar o COLLATE NOCASE da tabela usuarios.
  buscarPorEmail(email: string): Promise<Usuario | undefined>;
  // A implementação deve preservar a restrição UNIQUE de email do banco.
  inserir(usuario: NovoUsuario): Promise<number>;
}
