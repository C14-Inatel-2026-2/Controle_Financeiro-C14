import type { Goal } from "./goal.js"; // importa a interface Goal do arquivo goal.ts para ser usada na definição da interface GoalRepository

export interface GoalRepository {
  // Recebe o nome após trim e compara exatamente, diferenciando maiúsculas.
  // O valor-alvo não participa da busca nem do critério de duplicidade.
  findByName(name: string): Promise<Goal | null>;
  save(goal: Goal): Promise<void>;
}

export interface GoalCatalog extends GoalRepository {
  list(): Promise<Goal[]>;
}

export interface GoalWithProgress extends Goal {
  id: number;
  progressAmountInCents: number;
}

export interface GoalProgressCatalog extends GoalCatalog {
  listWithProgress(): Promise<GoalWithProgress[]>;
  findWithProgressByName(name: string): Promise<GoalWithProgress | null>;
  contribute(id: number, amountInCents: number): Promise<GoalWithProgress>;
}
