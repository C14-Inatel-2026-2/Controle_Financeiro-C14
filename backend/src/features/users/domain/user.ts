/**
 * Representação simples de usuário e suas regras de validação.
 *
 * Não trata login, hash de senha, identificador único ou persistência.
 */

export interface User {
  name: string;
  email: string;
  password: string;
}

export class InvalidUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUserError";
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function createUser(name: string, email: string, password: string): User {
  if (name.trim().length === 0) {
    throw new InvalidUserError("O nome não pode estar vazio");
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new InvalidUserError("O e-mail informado não é válido");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new InvalidUserError(
      `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`,
    );
  }

  return { name, email, password };
}
