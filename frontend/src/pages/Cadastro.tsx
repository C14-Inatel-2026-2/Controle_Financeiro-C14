import { useState } from "react";
import {
  ValidadorDeCadastro,
  type ErrosCadastro,
} from "../utils/ValidadorDeCadastro";
import { ServicoDeCadastro } from "../services/ServicoDeCadastro";

const validador = new ValidadorDeCadastro();

type Props = {
  aoEntrar: () => void;
  servico?: Pick<ServicoDeCadastro, "cadastrar">;
};

export function Cadastro({ aoEntrar, servico = new ServicoDeCadastro() }: Props) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<ErrosCadastro>({});
  const [sucesso, setSucesso] = useState(false);
  const [erroApi, setErroApi] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function cadastrar() {
    if (enviando) return;
    const novosErros = validador.validar({ nome, email, senha });
    setErros(novosErros);
    setSucesso(false);
    setErroApi("");
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      await servico.cadastrar({ nome, email, senha });
      setSucesso(true);
    } catch (erro) {
      setErroApi(erro instanceof Error ? erro.message : "Não foi possível cadastrar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-dividida">
      <aside className="painel-marca">
        <div className="logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="#45c79a" />
            <path
              d="M7 18l5-5 4 3 5-6"
              stroke="#0b1a14"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Controle Financeiro
        </div>

        <div className="chamada">
          <h2>Suas finanças, em ordem.</h2>
          <p>Receitas, despesas e faturas no mesmo lugar.</p>
        </div>

        <p className="rodape-marca">Projeto C14 · INATEL</p>
      </aside>

      <main className="painel-form">
        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            cadastrar();
          }}
          noValidate
        >
          <div className="titulo">
            <h1>Criar conta</h1>
            <p>Leva menos de um minuto.</p>
          </div>

          <label className="campo">
            Nome
            <input
              className={erros.nome ? "invalido" : ""}
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            {erros.nome && <span className="erro">{erros.nome}</span>}
          </label>

          <label className="campo">
            E-mail
            <input
              type="email"
              className={erros.email ? "invalido" : ""}
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {erros.email && <span className="erro">{erros.email}</span>}
          </label>

          <label className="campo">
            Senha
            <input
              type="password"
              className={erros.senha ? "invalido" : ""}
              placeholder="Mínimo de 8 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            {erros.senha && <span className="erro">{erros.senha}</span>}
          </label>

          <button type="submit" disabled={enviando}>
            {enviando ? "Cadastrando..." : "Cadastrar"}
          </button>

          {sucesso && <p className="sucesso">Conta criada! Agora é só entrar.</p>}
          {erroApi && <p className="erro" role="alert">{erroApi}</p>}

          <p className="rodape-form">
            Já tem conta?{" "}
            <button type="button" className="ap-link" onClick={aoEntrar}>
              Entrar
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}
