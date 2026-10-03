
 // Manda para a API
export type DadosCadastro = {
  nome: string;
  email: string;
  senha: string;
};

//  API devolve quando tem cadastro, sem senha.

export type Usuario = {
  id: number;
  nome: string;
  email: string;
};

//Envia cadastro para o backend
// Erro= aparece um error com a msg que a tela vai mostrar
export async function cadastrarUsuario(dados: DadosCadastro): Promise<Usuario> {
  const resposta = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });

  if (resposta.status === 409) {
    throw new Error("Este e-mail já está cadastrado.");
  }

  if (!resposta.ok) {
    throw new Error("Não foi possível cadastrar. Tente novamente.");
  }

  return resposta.json();
}