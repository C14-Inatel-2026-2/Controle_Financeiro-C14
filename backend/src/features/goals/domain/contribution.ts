export class InvalidContributionError extends Error {
  constructor() {
    super("Informe um ID válido e um aporte em centavos inteiros seguros e positivos.");
  }
}

export class GoalNotFoundError extends Error {
  constructor() { super("Meta não encontrada."); }
}

export class GoalProgressLimitError extends Error {
  constructor() { super("O acumulado da meta excederia o limite de centavos inteiros seguros."); }
}

export function validateContribution(id: number, amountInCents: number): void {
  if (!Number.isSafeInteger(id) || id <= 0 ||
      !Number.isSafeInteger(amountInCents) || amountInCents <= 0) {
    throw new InvalidContributionError();
  }
}
