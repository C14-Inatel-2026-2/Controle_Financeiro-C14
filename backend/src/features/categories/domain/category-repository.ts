import type { Category } from "./category.js";

export interface CategoryRepository {
  findByName(name: string): Promise<Category | null>;
  save(category: Category): Promise<void>;
}

export interface SavedCategory extends Category {
  id: number;
}

// Uma instância atende um único usuário: as buscas já filtram pelo dono.
export interface CategoryCatalog extends CategoryRepository {
  findByName(name: string): Promise<SavedCategory | null>;
  list(): Promise<SavedCategory[]>;
}
