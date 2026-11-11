// Logo "Controle Financeiro" clicável. Quem usa decide o destino:
// com sessão vai para o Início interno; sem sessão, para a página inicial pública.
type Props = {
  // Classe de layout de cada tela (logo, ap-logo...), para manter o visual atual.
  className: string;
  aoClicar: () => void;
  disabled?: boolean;
  tamanho?: number;
};

export function Logo({ className, aoClicar, disabled = false, tamanho = 28 }: Props) {
  return (
    // type="button": dentro de um formulário, o clique não envia nada.
    <button type="button" className={`${className} logo-botao`} onClick={aoClicar} disabled={disabled}>
      <svg width={tamanho} height={tamanho} viewBox="0 0 28 28" fill="none" aria-hidden="true">
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
    </button>
  );
}
