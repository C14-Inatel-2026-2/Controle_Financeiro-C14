// SQLite NOCASE compara letras ASCII sem diferenciar maiúsculas/minúsculas.
export function normalizarEmail(email: string): string {
  return email.trim().replace(/[A-Z]/g, (letra) => letra.toLowerCase());
}
