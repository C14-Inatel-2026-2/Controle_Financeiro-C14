import type { Goal } from "./goal.js"; // importa a interface Goal do arquivo goal.ts para ser usada na definição da interface GoalRepository

// A persistência concreta será implementada na integração.
export interface GoalRepository {
  // Recebe o nome após trim e compara exatamente, diferenciando maiúsculas.
  // O valor-alvo não participa da busca nem do critério de duplicidade.
  findByName(name: string): Promise<Goal | null>;
  save(goal: Goal): Promise<void>;
}
