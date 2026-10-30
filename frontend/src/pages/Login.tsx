import { useState } from "react";

// O login valida menos que o cadastro de propósito: aqui a senha é
// conferida pelo servidor, não pelo formato.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  aoEntrar: () => void;
  aoCriarConta: () => void;
};

export function Login({ aoEntrar, aoCriarConta }: Props) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});

  function entrar() {
    const novosErros: { email?: string; senha?: string } = {};

    if (!EMAIL.test(email.trim())) {
      novosErros.email = "Informe um e-mail válido.";
    }

    if (senha === "") {
      novosErros.senha = "Informe sua senha.";
    }

    setErros(novosErros);

    // Ainda não existe rota de login na API: por enquanto o acesso é liberado
    // quando o formulário está preenchido.
    if (Object.keys(novosErros).length === 0) {
      aoEntrar();
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
            entrar();
          }}
          noValidate
        >
          <div className="titulo">
            <h1>Entrar</h1>
            <p>Acesse sua conta para ver suas finanças.</p>
          </div>

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
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            {erros.senha && <span className="erro">{erros.senha}</span>}
          </label>

          <button type="submit">Entrar</button>

          <p className="rodape-form">
            Não tem conta?{" "}
            <button type="button" className="ap-link" onClick={aoCriarConta}>
              Criar conta
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}
