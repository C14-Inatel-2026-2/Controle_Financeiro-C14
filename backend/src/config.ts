type Ambiente = Record<string, string | undefined>;

// COOKIE_SECURE=false existe só para testar a imagem por HTTP (por exemplo, http://localhost).
// Sem a variável, o cookie é Secure em produção, que deve estar atrás de HTTPS.
export function lerCookieSeguro(ambiente: Ambiente): boolean {
  const valor = ambiente.COOKIE_SECURE;
  if (valor === undefined || valor === "") return ambiente.NODE_ENV === "production";
  if (valor === "true") return true;
  if (valor === "false") return false;
  throw new Error(`COOKIE_SECURE deve ser "true" ou "false", recebido: "${valor}".`);
}

export function lerPorta(ambiente: Ambiente): number {
  const porta = Number(ambiente.PORT ?? 3000);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    throw new Error(`PORT inválida: "${ambiente.PORT}".`);
  }
  return porta;
}
