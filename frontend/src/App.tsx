import { useState } from "react";
import { PaginaInicial } from "./pages/PaginaInicial";
import { Cadastro } from "./pages/Cadastro";

// Navegação simples enquanto são poucas telas: uma memória guarda qual
// mostrar. Quando houver mais telas, vale trocar pelo React Router.
type Tela = "inicial" | "cadastro";

export default function App() {
  const [tela, setTela] = useState<Tela>("inicial");

  if (tela === "cadastro") {
    return <Cadastro />;
  }

  return (
    <PaginaInicial
      aoCriarConta={() => setTela("cadastro")}
      // A tela de login ainda não existe: por enquanto leva ao cadastro.
      aoEntrar={() => setTela("cadastro")}
    />
  );
}
