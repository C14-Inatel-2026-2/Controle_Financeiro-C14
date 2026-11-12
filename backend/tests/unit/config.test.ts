import { describe, expect, it } from "vitest";
import { lerConfigBanco, lerCookieSeguro, lerPorta } from "../../src/config.js";

describe("lerCookieSeguro", () => {
  it("usa Secure em produção quando COOKIE_SECURE não foi definido", () => {
    expect(lerCookieSeguro({ NODE_ENV: "production" })).toBe(true);
    expect(lerCookieSeguro({ NODE_ENV: "production", COOKIE_SECURE: "" })).toBe(true);
    expect(lerCookieSeguro({})).toBe(false);
  });

  it("respeita o valor explícito, inclusive em produção", () => {
    expect(lerCookieSeguro({ NODE_ENV: "production", COOKIE_SECURE: "false" })).toBe(false);
    expect(lerCookieSeguro({ COOKIE_SECURE: "true" })).toBe(true);
  });

  it.each(["0", "no", "FALSE", "sim"])("recusa um valor ambíguo: %s", (valor) => {
    expect(() => lerCookieSeguro({ NODE_ENV: "production", COOKIE_SECURE: valor })).toThrow("COOKIE_SECURE");
  });
});

describe("lerPorta", () => {
  it("usa 3000 por padrão e aceita PORT", () => {
    expect(lerPorta({})).toBe(3000);
    expect(lerPorta({ PORT: "8080" })).toBe(8080);
  });

  it.each(["", "abc", "0", "70000", "80.5"])("recusa PORT inválida: %j", (porta) => {
    expect(() => lerPorta({ PORT: porta })).toThrow("PORT inválida");
  });
});

describe("lerConfigBanco", () => {
  // Valores fictícios: nenhum teste usa credenciais ou acessa o Turso.
  const url = "libsql://banco-ficticio.turso.io";
  const authToken = "token-ficticio";

  it("sem Turso usa o arquivo local de DATABASE_PATH ou o padrão", () => {
    expect(lerConfigBanco({})).toEqual({ caminho: "data/financeiro.sqlite" });
    expect(lerConfigBanco({ DATABASE_PATH: "/data/financeiro.sqlite" })).toEqual({ caminho: "/data/financeiro.sqlite" });
  });

  it("com URL e token usa somente o Turso, mesmo com DATABASE_PATH definido", () => {
    expect(lerConfigBanco({ TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken, DATABASE_PATH: "/data/x.sqlite" }))
      .toEqual({ url, authToken });
    expect(lerConfigBanco({ TURSO_DATABASE_URL: "https://banco-ficticio.turso.io", TURSO_AUTH_TOKEN: authToken }))
      .toEqual({ url: "https://banco-ficticio.turso.io", authToken });
  });

  it("falha com mensagem clara quando a configuração remota está incompleta ou inválida", () => {
    expect(() => lerConfigBanco({ TURSO_DATABASE_URL: url })).toThrow("TURSO_DATABASE_URL foi definido sem TURSO_AUTH_TOKEN");
    expect(() => lerConfigBanco({ TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: "  " })).toThrow("sem TURSO_AUTH_TOKEN");
    expect(() => lerConfigBanco({ TURSO_AUTH_TOKEN: authToken })).toThrow("TURSO_AUTH_TOKEN foi definido sem TURSO_DATABASE_URL");
    expect(() => lerConfigBanco({ TURSO_DATABASE_URL: "file:local.db", TURSO_AUTH_TOKEN: authToken })).toThrow("libsql://");
  });

  it("não repete o token nas mensagens de erro", () => {
    expect(() => lerConfigBanco({ TURSO_DATABASE_URL: "ftp://x", TURSO_AUTH_TOKEN: authToken }))
      .toThrow(expect.objectContaining({ message: expect.not.stringContaining(authToken) }));
  });

  it("no Render, exige o Turso em vez de gravar no disco temporário", () => {
    expect(() => lerConfigBanco({ RENDER: "true", DATABASE_PATH: "/data/financeiro.sqlite" })).toThrow("No Render, defina TURSO_DATABASE_URL");
    expect(lerConfigBanco({ RENDER: "true", TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken })).toEqual({ url, authToken });
  });
});
