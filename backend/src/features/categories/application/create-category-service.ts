import { createCategory, type Category } from "../domain/category.js";
import type { CategoryRepository } from "../domain/category-repository.js";

export class CategoryAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`A categoria ${name} já está cadastrada`);
    this.name = "CategoryAlreadyExistsError";
  }
}

export async function createCategoryService(
  name: string,
  repository: CategoryRepository,
): Promise<Category> {
  const category = createCategory(name);

  const existingCategory = await repository.findByName(category.name);
  if (existingCategory) {
    throw new CategoryAlreadyExistsError(category.name);
  }

  await repository.save(category);

  return category;
}
