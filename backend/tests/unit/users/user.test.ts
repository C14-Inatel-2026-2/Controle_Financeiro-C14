import { describe, expect, it } from "vitest";

import { createUser } from "../../../src/features/users/domain/user.js";

describe("Usuario", () => {
  it("deve criar um usuario com dados validos", () => {
    const user = createUser("Caio", "caio@email.com", "12345678");

    expect(user).toEqual({
      name: "Caio",
      email: "caio@email.com",
      password: "12345678",
    });
  });

  // Caso negativo: email sem formato valido deve gerar erro.
  it("deve rejeitar um usuario com email invalido", () => {
    expect(() => createUser("Caio", "email-invalido", "12345678")).toThrow();
  });
});
