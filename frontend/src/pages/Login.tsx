import { useState } from "react";
import { ServicoDeAutenticacao } from "../services/ServicoDeAutenticacao";
import type { Usuario } from "../services/ServicoDeCadastro";
import { Logo } from "../components/Logo";

// A tela confere o preenchimento e só avança depois que a API confirma o login.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  aoEntrar: (usuario: Usuario) => void;
  aoCriarConta: () => void;
  aoVoltarInicio: () => void;
  // Mensagem vinda do App, por exemplo quando a sessão expirou.
  aviso?: string;
  servico?: Pick<ServicoDeAutenticacao, "entrar">;
};

export function Login({ aoEntrar, aoCriarConta, aoVoltarInicio, aviso = "", servico = new ServicoDeAutenticacao() }: Props) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const [erroApi, setErroApi] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    if (enviando) return;
    const novosErros: { email?: string; senha?: string } = {};

    if (!EMAIL.test(email.trim())) {
      novosErros.email = "Informe um e-mail válido.";
    }

    if (senha === "") {
      novosErros.senha = "Informe sua senha.";
    }

    setErros(novosErros);
    setErroApi("");
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      const usuario = await servico.entrar(email, senha);
      aoEntrar(usuario);
    } catch (erro) {
      // 401 (senha errada ou e-mail inexistente) e falha de rede caem aqui.
      setErroApi(erro instanceof Error ? erro.message : "Não foi possível entrar. Tente novamente.");
      setEnviando(false);
    }
  }

  return (
    <div className="tela-dividida">
      <aside className="painel-marca">
        <Logo className="logo" aoClicar={aoVoltarInicio} disabled={enviando} />

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
          <button type="button" className="ap-link voltar-inicio" onClick={aoVoltarInicio} disabled={enviando}>
            ← Voltar ao início
          </button>

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

          <button type="submit" disabled={enviando}>
            {enviando ? "Entrando..." : "Entrar"}
          </button>

          {erroApi && <p className="erro" role="alert">{erroApi}</p>}
          {!erroApi && aviso && <p className="erro" role="status">{aviso}</p>}

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
