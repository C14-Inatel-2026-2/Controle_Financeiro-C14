export interface Category {
  name: string;
}

export class InvalidCategoryNameError extends Error {
  constructor() {
    super("O nome da categoria não pode ser vazio");
    this.name = "InvalidCategoryNameError";
  }
}

export function createCategory(name: string): Category {
  const normalizedName = name.trim();

  if (normalizedName === "") {
    throw new InvalidCategoryNameError();
  }

  return { name: normalizedName };
}
