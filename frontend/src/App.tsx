import { Cadastro } from "./pages/Cadastro";
import { Metas } from "./pages/Metas";
import { useEffect, useState } from "react";

export default function App() {
  const [pagina, setPagina] = useState(window.location.hash);
  useEffect(() => {
    const navegar = () => setPagina(window.location.hash);
    window.addEventListener("hashchange", navegar);
    return () => window.removeEventListener("hashchange", navegar);
  }, []);
  return <>
    <nav className="navegacao" aria-label="Navegação principal">
      <a href="#cadastro" aria-current={pagina !== "#metas" ? "page" : undefined}>Criar conta</a>
      <a href="#metas" aria-current={pagina === "#metas" ? "page" : undefined}>Metas financeiras</a>
    </nav>
    {pagina === "#metas" ? <Metas /> : <Cadastro />}
  </>;
}
