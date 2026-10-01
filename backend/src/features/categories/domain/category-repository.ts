import type { Category } from "./category.js";

export interface CategoryRepository {
  findByName(name: string): Promise<Category | null>;
  save(category: Category): Promise<void>;
}
