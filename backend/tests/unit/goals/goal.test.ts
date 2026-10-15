import { describe, expect, it } from "vitest"; //Testes sem mock

import {
  createGoal,
  InvalidGoalTargetAmountError,
} from "../../../src/features/goals/domain/goal.js";

describe("createGoal — sem mock", () => {
  it("cria uma meta válida e remove espaços externos do nome", () => {
    const goal = createGoal(" Viagem ", 100000);

    expect(goal).toEqual({ name: "Viagem", targetAmountInCents: 100000 });
  });

  it("rejeita uma meta com valor-alvo inválido", () => {
    const invalidAmounts = [
      0,
      -100,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ];

    for (const amount of invalidAmounts) {
      expect(() => createGoal("Viagem", amount)).toThrow(
        InvalidGoalTargetAmountError,
      );
    }
  });
});
