import type { Tela } from "../navegacao";

// Barra de cima das telas internas: logo, menu e usuário.
// Fica num componente só para as três telas não repetirem o mesmo código.
type Props = {
  ativo: Tela;
  aoNavegar: (tela: Tela) => void;
};

const MENU: { tela: Tela; rotulo: string }[] = [
  { tela: "home", rotulo: "Início" },
  { tela: "dashboard", rotulo: "Dashboard" },
  { tela: "categorias", rotulo: "Categorias" },
];

export function Topo({ ativo, aoNavegar }: Props) {
  return (
    <header className="ap-topo">
      <div className="ap-logo">
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
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
        <span>Donatto</span>
        <div className="ap-avatar">DP</div>
      </div>
    </header>
  );
}
