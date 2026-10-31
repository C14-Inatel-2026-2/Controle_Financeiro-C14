import { useState } from "react";
import { PaginaInicial } from "./pages/PaginaInicial";
import { Login } from "./pages/Login";
import { Cadastro } from "./pages/Cadastro";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { Categorias } from "./pages/Categorias";
import type { Tela } from "./navegacao";

// Navegação simples: uma memória guarda qual tela está visível. Quando as
// telas crescerem, ou quando cada uma precisar de endereço próprio, vale
// trocar isto pelo React Router.
export default function App() {
  const [tela, setTela] = useState<Tela>("inicial");

  switch (tela) {
    case "login":
      return (
        <Login
          aoEntrar={() => setTela("home")}
          aoCriarConta={() => setTela("cadastro")}
        />
      );

    case "cadastro":
      return <Cadastro aoEntrar={() => setTela("login")} />;

    case "home":
      return <Home aoNavegar={setTela} />;

    case "dashboard":
      return <Dashboard aoNavegar={setTela} />;

    case "categorias":
      return <Categorias aoNavegar={setTela} />;

    default:
      return (
        <PaginaInicial
          aoCriarConta={() => setTela("cadastro")}
          aoEntrar={() => setTela("login")}
        />
      );
  }
}
