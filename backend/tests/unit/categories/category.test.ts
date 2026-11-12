import { describe, expect, it } from "vitest";

import {
  createCategory,
  InvalidCategoryNameError,
} from "../../../src/features/categories/domain/category.js";

describe("createCategory", () => {
  it("rejeita 51 caracteres com erro específico de categoria", () => {
    const criar = () => createCategory("Alimentação".padEnd(51, "x"));
    expect(criar).toThrow(InvalidCategoryNameError);
    expect(criar).toThrow("O nome da categoria deve ter no máximo 50 caracteres.");
  });

  it("deve criar categoria com nome valido", () => {
    const category = createCategory(" Alimentacao ");

    expect(category).toEqual({ name: "Alimentacao" });
  });

  it("deve rejeitar categoria com nome vazio", () => {
    expect(() => createCategory("   ")).toThrow(InvalidCategoryNameError);
  });

  it("deve rejeitar nome que nao seja texto", () => {
    for (const name of [123, null, undefined, ["Lazer"]]) {
      expect(() => createCategory(name as unknown as string)).toThrow(InvalidCategoryNameError);
    }
  });
});
