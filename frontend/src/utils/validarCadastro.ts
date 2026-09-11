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

export function validarCadastro(dados: DadosCadastro): ErrosCadastro {
    const erros: ErrosCadastro = {};
    // Trim = tirar espaços do inicio e fim
    if (dados.nome.trim() === "") {
        erros.nome = "Informe seu nome.";
    }
    // Regex para ficar com padrão x@y.z
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) {
        erros.email = "Informe um e-mail válido.";
    }

    if (dados.senha.length < 8) {
        erros.senha = "A senha deve ter pelo menos 8 caracteres.";
    }

    return erros;
}
