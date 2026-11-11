import { describe, expect, it } from "vitest";
import { lerCookieSeguro, lerPorta } from "../../src/config.js";

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
