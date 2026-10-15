/**
 * Contrato de persistência do usuário.
 *
 * A implementação concreta (ex.: SQLite) será criada em outra etapa. Esta
 * interface existe para que o CreateUserService dependa de uma abstração e
 * possa ser testado com mock.
 */

import type { User } from "./user.js";

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
