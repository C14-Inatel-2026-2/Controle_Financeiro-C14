// Concatena os dígitos: não multiplica um valor decimal em ponto flutuante.
export function centavosDeReais(texto: string): number {
  const valor = texto.trim();
  if (!/^\d+([,.]\d{1,2})?$/.test(valor)) throw new Error("Informe um valor positivo em reais com até duas casas decimais.");
  const [inteiros, fracao = ""] = valor.split(/[,.]/);
  const centavos = Number(inteiros + fracao.padEnd(2, "0"));
  if (!Number.isSafeInteger(centavos) || centavos <= 0) throw new Error("O valor deve ser positivo e estar no limite de centavos seguros.");
  return centavos;
}
