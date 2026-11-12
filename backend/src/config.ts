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

// Sem as variáveis do Turso, usa o arquivo local (DATABASE_PATH, ou data/financeiro.sqlite).
// Com elas, usa somente o Turso: um erro de conexão encerra a aplicação, sem cair para o arquivo.
// As mensagens nunca repetem a URL nem o token, que podem conter credenciais.
export function lerConfigBanco(ambiente: Ambiente): { caminho: string } | { url: string; authToken: string } {
  const url = ambiente.TURSO_DATABASE_URL?.trim() ?? "";
  const authToken = ambiente.TURSO_AUTH_TOKEN?.trim() ?? "";

  if (url === "" && authToken === "") {
    // O Render gratuito não tem disco persistente: um arquivo local some a cada reinício.
    if (ambiente.RENDER === "true") {
      throw new Error("No Render, defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN: o disco do serviço não guarda o banco.");
    }
    return { caminho: ambiente.DATABASE_PATH?.trim() || "data/financeiro.sqlite" };
  }
  if (url === "") throw new Error("TURSO_AUTH_TOKEN foi definido sem TURSO_DATABASE_URL. Defina as duas variáveis.");
  if (authToken === "") throw new Error("TURSO_DATABASE_URL foi definido sem TURSO_AUTH_TOKEN. Defina as duas variáveis.");
  if (!/^(libsql|https):\/\/[^/?#\s]+/.test(url)) {
    throw new Error("TURSO_DATABASE_URL deve começar com libsql:// ou https://, como mostra o painel do Turso.");
  }
  return { url, authToken };
}
