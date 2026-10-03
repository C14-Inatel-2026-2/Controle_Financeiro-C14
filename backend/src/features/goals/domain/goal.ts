export interface Goal {// define a interface para uma meta financeira
  name: string;
  targetAmountInCents: number;
}

export class InvalidGoalNameError extends Error {
  constructor() {
    super("O nome da meta não pode ser vazio");
    this.name = "InvalidGoalNameError";
  }
}

export class InvalidGoalTargetAmountError extends Error {
  constructor() {
    super("O valor-alvo da meta deve ser um inteiro seguro e positivo em centavos");
    this.name = "InvalidGoalTargetAmountError";
  }
}

export function createGoal(name: string, targetAmountInCents: number): Goal {
  const normalizedName = name.trim();

  if (normalizedName === "") {
    throw new InvalidGoalNameError();
  }

  if (!Number.isSafeInteger(targetAmountInCents) || targetAmountInCents <= 0) {
    throw new InvalidGoalTargetAmountError();
  }

  return { name: normalizedName, targetAmountInCents };
}
