export type DadosCadastro = {
  nome: string;
  email: string;
  senha: string;
};

export type ErrosCadastro = {
  nome?: string;
  email?: string;
  senha?: string;
};

/** Regras do cadastro. Não depende de rede nem de tela, então testa sem mock. */
export class ValidadorDeCadastro {
  private readonly EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly MINIMO_SENHA = 8;

  validar(dados: DadosCadastro): ErrosCadastro {
    const erros: ErrosCadastro = {};

    if (dados.nome.trim() === "") {
      erros.nome = "Informe seu nome.";
    }

    if (!this.EMAIL.test(dados.email.trim())) {
      erros.email = "Informe um e-mail válido.";
    }

    if (dados.senha.length < this.MINIMO_SENHA) {
      erros.senha = `A senha deve ter pelo menos ${this.MINIMO_SENHA} caracteres.`;
    }

    return erros;
  }
}