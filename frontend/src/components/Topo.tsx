import { useState } from "react";
import type { Tela } from "../navegacao";
import type { Usuario } from "../services/ServicoDeCadastro";
import { iniciais, primeiroNome } from "../utils/nomeDoUsuario";
import { Logo } from "./Logo";

// Barra de cima das telas internas: logo, menu, usuário conectado e Sair.
// Fica num componente só para as três telas não repetirem o mesmo código.
export type PropsDaSessao = {
  usuario: Usuario;
  // Chama o logout da API; rejeita se a saída não for confirmada.
  aoSair: () => Promise<void>;
};

type Props = PropsDaSessao & {
  ativo: Tela;
  aoNavegar: (tela: Tela) => void;
};

const MENU: { tela: Tela; rotulo: string }[] = [
  { tela: "importacao", rotulo: "Importar fatura" },
  { tela: "home", rotulo: "Início" },
  { tela: "dashboard", rotulo: "Dashboard" },
  { tela: "categorias", rotulo: "Categorias" },
];

export function Topo({ ativo, aoNavegar, usuario, aoSair }: Props) {
  const [saindo, setSaindo] = useState(false);
  const [erroSair, setErroSair] = useState("");

  async function sair() {
    if (saindo) return;
    setSaindo(true);
    setErroSair("");
    try {
      await aoSair();
    } catch (erro) {
      // Só quando a saída falha a tela continua aqui para mostrar o erro.
      setErroSair(erro instanceof Error ? erro.message : "Não foi possível sair.");
      setSaindo(false);
    }
  }

  return (
    <header className="ap-topo">
      <Logo className="ap-logo" tamanho={26} aoClicar={() => aoNavegar("home")} />

      <nav className="ap-menu">
        {MENU.map((item) => (
          <button
            key={item.tela}
            className={item.tela === ativo ? "ap-item ap-item-ativo" : "ap-item"}
            onClick={() => aoNavegar(item.tela)}
          >
            {item.rotulo}
          </button>
        ))}
      </nav>

      <div className="ap-usuario">
        {erroSair && <span className="erro" role="alert">{erroSair}</span>}
        <span>{primeiroNome(usuario.nome)}</span>
        <div className="ap-avatar" aria-hidden="true">{iniciais(usuario.nome)}</div>
        <button type="button" className="ap-link" onClick={() => void sair()} disabled={saindo}>
          {saindo ? "Saindo..." : "Sair"}
        </button>
      </div>
    </header>
  );
}
