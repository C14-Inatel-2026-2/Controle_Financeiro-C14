export interface DadosCadastro {
  nome: string;
  email: string;
  senha: string;
}

export interface NovoUsuario {
  nome: string;
  email: string;
  senha_hash: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
}
