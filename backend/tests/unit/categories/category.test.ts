import { describe, expect, it } from "vitest";

import {
  createCategory,
  InvalidCategoryNameError,
} from "../../../src/features/categories/domain/category.js";

describe("createCategory", () => {
  it("deve criar categoria com nome valido", () => {
    const category = createCategory(" Alimentacao ");

    expect(category).toEqual({ name: "Alimentacao" });
  });

  it("deve rejeitar categoria com nome vazio", () => {
    expect(() => createCategory("   ")).toThrow(InvalidCategoryNameError);
  });
});
