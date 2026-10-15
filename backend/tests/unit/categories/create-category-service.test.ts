import { describe, expect, it, vi } from "vitest";

import {
  CategoryAlreadyExistsError,
  createCategoryService,
} from "../../../src/features/categories/application/create-category-service.js";
import type { CategoryRepository } from "../../../src/features/categories/domain/category-repository.js";

describe("createCategoryService", () => {
  it("deve salvar categoria quando ela ainda nao existe", async () => {
    const repository = {
      findByName: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
    } satisfies CategoryRepository;

    const category = await createCategoryService(" Transporte ", repository);

    expect(repository.findByName).toHaveBeenCalledWith("Transporte");
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith({ name: "Transporte" });
    expect(category).toEqual({ name: "Transporte" });
  });

  it("nao deve salvar categoria quando ela ja existe", async () => {
    const repository = {
      findByName: vi.fn().mockResolvedValue({ name: "Lazer" }),
      save: vi.fn(),
    } satisfies CategoryRepository;

    await expect(createCategoryService("Lazer", repository)).rejects.toThrow(
      CategoryAlreadyExistsError,
    );

    expect(repository.save).not.toHaveBeenCalled();
  });
});
