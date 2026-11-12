import { useCallback, useEffect, useState } from "react";
import { PaginaInicial } from "./pages/PaginaInicial";
import { Login } from "./pages/Login";
import { Cadastro } from "./pages/Cadastro";
import { Movimentacoes } from "./pages/Movimentacoes";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { Categorias } from "./pages/Categorias";
import type { Tela } from "./navegacao";
import { ImportarFatura } from "./pages/ImportarFatura";
import { ServicoDeAutenticacao } from "./services/ServicoDeAutenticacao";
import type { Usuario } from "./services/ServicoDeCadastro";

// Fora do componente: uma instância nova a cada render dispararia o useEffect de novo.
const servicoPadrao = new ServicoDeAutenticacao();

// Telas que só abrem com uma sessão confirmada pela API.
const INTERNAS: Tela[] = ["home", "dashboard", "categorias", "importacao", "movimentacoes"];

type Props = {
  servico?: Pick<ServicoDeAutenticacao, "entrar" | "usuarioAtual" | "sair">;
};

// Navegação simples: uma memória guarda qual tela está visível. Quando as
// telas crescerem, ou quando cada uma precisar de endereço próprio, vale
// trocar isto pelo React Router.
export default function App({ servico = servicoPadrao }: Props) {
  const [tela, setTela] = useState<Tela>("inicial");
  // null = sem sessão. Só existe depois que a API confirma o login ou o /auth/me.
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [aviso, setAviso] = useState("");

  // Ao abrir (ou após F5), o cookie da sessão diz se a pessoa continua conectada.
  useEffect(() => {
    let ativo = true;
    servico
      .usuarioAtual()
      .then((atual) => {
        if (ativo && atual) {
          setUsuario(atual);
          setTela("home");
        }
      })
      // API fora do ar: segue como visitante; o login mostra o erro se tentar entrar.
      .catch(() => {})
      .finally(() => { if (ativo) setVerificandoSessao(false); });
    return () => { ativo = false; };
  }, [servico]);

  function entrar(conectado: Usuario) {
    setAviso("");
    setUsuario(conectado);
    setTela("home");
  }

  // Só limpa a conta depois que a API confirmar a saída; se falhar, o Topo mostra o erro.
  async function sair() {
    await servico.sair();
    setUsuario(null);
    setTela("login");
  }

  // Uma chamada protegida respondeu 401: a sessão acabou no servidor.
  const sessaoExpirada = useCallback(() => {
    setUsuario(null);
    setAviso("Sua sessão expirou. Entre novamente.");
    setTela("login");
  }, []);

  // Destino do logo nas telas públicas: Início com sessão, página inicial sem.
  const irParaInicio = () => setTela(usuario ? "home" : "inicial");

  if (verificandoSessao) {
    return <p className="ap-nota" role="status">Carregando...</p>;
  }

  // Sem usuário, nenhuma tela interna abre: vai para o login.
  const visivel: Tela = !usuario && INTERNAS.includes(tela) ? "login" : tela;

  if (usuario) {
    const sessao = { usuario, aoSair: sair };
    switch (visivel) {
      case "importacao":
        return <ImportarFatura aoVoltar={() => setTela("home")} aoSessaoExpirada={sessaoExpirada} />;
      case "home":
        return <Home aoNavegar={setTela} {...sessao} />;
      case "dashboard":
        return <Dashboard key={usuario.id} aoSessaoExpirada={sessaoExpirada} aoNavegar={setTela} {...sessao} />;
      case "movimentacoes":
        return <Movimentacoes key={usuario.id} aoNavegar={setTela} aoSessaoExpirada={sessaoExpirada} {...sessao} />;
      case "categorias":
        return <Categorias aoNavegar={setTela} aoSessaoExpirada={sessaoExpirada} {...sessao} />;
    }
  }

  switch (visivel) {
    case "login":
      return (
        <Login
          aoEntrar={entrar}
          aoCriarConta={() => setTela("cadastro")}
          aoVoltarInicio={irParaInicio}
          aviso={aviso}
          servico={servico}
        />
      );

    case "cadastro":
      return <Cadastro aoEntrar={() => setTela("login")} aoVoltarInicio={irParaInicio} />;

    default:
      return (
        <PaginaInicial
          aoCriarConta={() => setTela("cadastro")}
          aoEntrar={() => setTela("login")}
        />
      );
  }
}
