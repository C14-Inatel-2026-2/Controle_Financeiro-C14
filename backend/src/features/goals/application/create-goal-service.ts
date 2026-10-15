import { createGoal, type Goal } from "../domain/goal.js"; //valida e cria uma meta financeira usando a função createGoal do arquivo goal.ts
import type { GoalRepository } from "../domain/goal-repository.js";

export class GoalAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`A meta ${name} já está cadastrada`);
    this.name = "GoalAlreadyExistsError";
  }
}

export async function createGoalService(
  name: string,
  targetAmountInCents: number,
  repository: GoalRepository,
): Promise<Goal> {
  const goal = createGoal(name, targetAmountInCents);

  const existingGoal = await repository.findByName(goal.name);
  if (existingGoal) {
    throw new GoalAlreadyExistsError(goal.name);
  }

  await repository.save(goal);

  return goal;
}
