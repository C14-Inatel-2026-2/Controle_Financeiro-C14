import { describe, expect, it, vi } from "vitest";

import { CreateUserService } from "../../../src/features/users/application/create-user-service.js";
import type { UserRepository } from "../../../src/features/users/domain/user-repository.js";

describe("CreateUserService", () => {
  it("deve salvar o usuario quando o email nao esta cadastrado", async () => {
    const repository: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const service = new CreateUserService(repository);

    const user = await service.execute("Caio", "caio@email.com", "12345678");

    expect(repository.findByEmail).toHaveBeenCalledWith("caio@email.com");
    expect(repository.save).toHaveBeenCalledOnce();
    expect(user).toEqual({
      name: "Caio",
      email: "caio@email.com",
      password: "12345678",
    });
  });

  // Caso negativo: email ja cadastrado nao deve chegar a salvar o usuario.
  it("nao deve salvar usuario quando o email ja esta cadastrado", async () => {
    const existingUser = {
      name: "Caio",
      email: "caio@email.com",
      password: "12345678",
    };
    const repository: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(existingUser),
      save: vi.fn(),
    };
    const service = new CreateUserService(repository);

    await expect(
      service.execute("Caio", "caio@email.com", "12345678"),
    ).rejects.toThrow("já está cadastrado");

    expect(repository.save).not.toHaveBeenCalled();
  });
});
