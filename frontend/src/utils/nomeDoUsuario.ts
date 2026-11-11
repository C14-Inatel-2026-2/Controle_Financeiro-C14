// "Ana Teste" -> "Ana". Usado no topo e na saudação.
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? "";
}

// "Ana Teste" -> "AT"; "Ana" -> "A". Primeira letra do primeiro e do último nome.
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  const letras = partes.length === 1 ? [partes[0]] : [partes[0], partes[partes.length - 1]];
  return letras.map((parte) => parte[0].toUpperCase()).join("");
}
