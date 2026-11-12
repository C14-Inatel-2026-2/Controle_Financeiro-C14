import { scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { gerarHashDeSenha, HASH_FICTICIO, senhaConfere } from "../../../src/services/senhas.js";

describe("Módulo de senhas", () => {
  it("gera scrypt:<salt>:<hash> com salt de 16 bytes, hash de 64 bytes e parâmetros padrão do scrypt", async () => {
    const senhaHash = await gerarHashDeSenha("senha-de-teste");
    expect(senhaHash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);

    const [, salt, hash] = senhaHash.split(":");
    expect(hash).toBe(scryptSync("senha-de-teste", salt!, 64).toString("hex"));
  });

  it("usa um salt diferente a cada cadastro", async () => {
    expect(await gerarHashDeSenha("mesma-senha")).not.toBe(await gerarHashDeSenha("mesma-senha"));
  });

  it("confere a senha certa e rejeita a errada", async () => {
    const senhaHash = await gerarHashDeSenha("senha-certa");
    expect(await senhaConfere("senha-certa", senhaHash)).toBe(true);
    expect(await senhaConfere("senha-errada", senhaHash)).toBe(false);
  });

  it("rejeita hash em formato desconhecido ou incompleto", async () => {
    for (const senhaHash of ["texto-puro", "bcrypt:abc:def", "scrypt::abcd", "scrypt:abcd:", "scrypt:abcd:zz"]) {
      expect(await senhaConfere("qualquer", senhaHash)).toBe(false);
    }
  });

  it("mantém o hash fictício em formato válido, para o e-mail inexistente também derivar a chave", async () => {
    expect(HASH_FICTICIO).toMatch(/^scrypt:0{32}:0{128}$/);
    expect(await senhaConfere("qualquer-senha", HASH_FICTICIO)).toBe(false);
  });
});
