export function validarMeta(nome: string, valorEmReais: string) {
  if (!nome.trim()) throw new Error("Informe o nome da meta.");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(valorEmReais.trim())) {
    throw new Error("Informe um valor-alvo positivo com até duas casas decimais.");
  }
  const [reais, centavos = ""] = valorEmReais.trim().replace(",", ".").split(".");
  // Converte os dígitos diretamente, sem arredondamento de ponto flutuante.
  const valor = BigInt(reais) * 100n + BigInt(centavos.padEnd(2, "0"));
  if (valor <= 0n || valor > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("O valor-alvo deve ser positivo e estar no limite de centavos seguros.");
  }
  return { name: nome.trim(), targetAmountInCents: Number(valor) };
}
