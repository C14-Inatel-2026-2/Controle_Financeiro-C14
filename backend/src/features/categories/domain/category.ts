export interface Category {
  name: string;
}

const LIMITE_NOME_CATEGORIA = 50;

export class InvalidCategoryNameError extends Error {
  constructor(message = "O nome da categoria não pode ser vazio") {
    super(message);
    this.name = "InvalidCategoryNameError";
  }
}

export function createCategory(name: string): Category {
  const normalizedName = typeof name === "string" ? name.trim() : "";

  if (normalizedName === "") {
    throw new InvalidCategoryNameError();
  }
  if (normalizedName.length > LIMITE_NOME_CATEGORIA) {
    throw new InvalidCategoryNameError(`O nome da categoria deve ter no máximo ${LIMITE_NOME_CATEGORIA} caracteres.`);
  }

  return { name: normalizedName };
}
