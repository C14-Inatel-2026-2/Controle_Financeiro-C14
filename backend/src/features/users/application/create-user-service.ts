/**
 * Serviço responsável por cadastrar um novo usuário.
 */

import { createUser, type User } from "../domain/user.js";
import type { UserRepository } from "../domain/user-repository.js";

export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`O e-mail ${email} já está cadastrado`);
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class CreateUserService {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(name: string, email: string, password: string): Promise<User> {
    const user = createUser(name, email, password);

    const existingUser = await this.userRepository.findByEmail(user.email);
    if (existingUser) {
      throw new EmailAlreadyRegisteredError(user.email);
    }

    await this.userRepository.save(user);

    return user;
  }
}
