import { describe, expect, it, vi } from "vitest"; // Testes com mock

import {
  createGoalService,
  GoalAlreadyExistsError,
} from "../../../src/features/goals/application/create-goal-service.js";
import type { GoalRepository } from "../../../src/features/goals/domain/goal-repository.js";

describe("createGoalService — com mock", () => {
  it("salva uma nova meta quando o nome ainda não existe", async () => {
    const repository = {
      findByName: vi.fn<GoalRepository["findByName"]>().mockResolvedValue(null),
      save: vi.fn<GoalRepository["save"]>().mockResolvedValue(undefined),
    } satisfies GoalRepository;

    const goal = await createGoalService(" Viagem ", 100000, repository);

    expect(repository.findByName).toHaveBeenCalledTimes(1);
    expect(repository.findByName).toHaveBeenCalledWith("Viagem");
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith({
      name: "Viagem",
      targetAmountInCents: 100000,
    });
    expect(goal).toEqual({ name: "Viagem", targetAmountInCents: 100000 });
  });

  it("rejeita uma meta duplicada pelo nome normalizado sem chamar save", async () => {
    const repository = {
      findByName: vi.fn<GoalRepository["findByName"]>().mockResolvedValue({
        name: "Viagem",
        targetAmountInCents: 100000,
      }),
      save: vi.fn<GoalRepository["save"]>().mockResolvedValue(undefined),
    } satisfies GoalRepository;

    // Mesmo nome após trim continua duplicado, ainda que o valor-alvo mude.
    await expect(
      createGoalService(" Viagem ", 200000, repository),
    ).rejects.toThrow(GoalAlreadyExistsError);

    expect(repository.findByName).toHaveBeenCalledTimes(1);
    expect(repository.findByName).toHaveBeenCalledWith("Viagem");
    expect(repository.save).not.toHaveBeenCalled();
  });
});
