import { useState } from "react";
import {
  ValidadorDeCadastro,
  type ErrosCadastro,
} from "../utils/ValidadorDeCadastro";

const validador = new ValidadorDeCadastro();

export function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<ErrosCadastro>({});
  const [sucesso, setSucesso] = useState(false);

  function cadastrar() {
    const novosErros = validador.validar({ nome, email, senha });
    setErros(novosErros);
    setSucesso(Object.keys(novosErros).length === 0);
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

          <button type="submit">Cadastrar</button>

          {sucesso && <p className="sucesso">Cadastro válido!</p>}

          <p className="rodape-form">
            Já tem conta? <a href="#">Entrar</a>
          </p>
        </form>
      </main>
    </div>
  );
}
