// Tela pública: é o que a pessoa vê antes de entrar no sistema.
// Recebe por props o que fazer em cada botão, então ela não decide
// a navegação — quem decide é o App.tsx.
type Props = {
  aoCriarConta: () => void;
  aoEntrar: () => void;
};

export function PaginaInicial({ aoCriarConta, aoEntrar }: Props) {
  return (
    <div className="pi-pagina">
      <header className="pi-topo">
        <div className="pi-logo">
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

        <div className="pi-acoes-topo">
          <button className="pi-link" onClick={aoEntrar}>
            Entrar
          </button>
          <button className="pi-botao" onClick={aoCriarConta}>
            Criar conta
          </button>
        </div>
      </header>

      <main className="pi-conteudo">
        <div className="pi-hero">
          <div className="pi-texto">
            <h1>
              Suas finanças,
              <br />
              em ordem.
            </h1>

            <p className="pi-descricao">
              Registre receitas e despesas, organize por categoria, acompanhe
              suas metas e importe a fatura do banco. Tudo em um lugar só.
            </p>

            <div className="pi-cta">
              <button className="pi-botao pi-botao-grande" onClick={aoCriarConta}>
                Criar conta
              </button>
              <button className="pi-botao-secundario" onClick={aoEntrar}>
                Já tenho conta
              </button>
            </div>
          </div>

          {/* Prévia do produto: mostra o que a pessoa ganha ao se cadastrar. */}
          <div className="pi-previa">
            <div className="pi-previa-topo">
              <span className="pi-rotulo">Saldo atual</span>
              <span className="pi-mes">Outubro de 2026</span>
            </div>
            <div className="pi-saldo">R$ 2.480,00</div>

            <div className="pi-resumo">
              <div className="pi-resumo-item">
                <div className="pi-resumo-titulo">Receitas</div>
                <div className="pi-receita">R$ 4.200,00</div>
              </div>
              <div className="pi-resumo-item">
                <div className="pi-resumo-titulo">Despesas</div>
                <div className="pi-despesa">R$ 1.720,00</div>
              </div>
            </div>

            <div className="pi-barras">
              <div className="pi-barra">
                <span>Alimentação</span>
                <div className="pi-trilho">
                  <div className="pi-preenchimento" style={{ width: "100%" }} />
                </div>
              </div>
              <div className="pi-barra">
                <span>Transporte</span>
                <div className="pi-trilho">
                  <div className="pi-preenchimento" style={{ width: "66%" }} />
                </div>
              </div>
              <div className="pi-barra">
                <span>Moradia</span>
                <div className="pi-trilho">
                  <div className="pi-preenchimento" style={{ width: "61%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pi-recursos">
          <div className="pi-recurso">
            <div className="pi-icone">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <div className="pi-recurso-titulo">Receitas e despesas</div>
              <div className="pi-recurso-texto">
                Lance cada movimentação e veja o saldo na hora.
              </div>
            </div>
          </div>

          <div className="pi-recurso">
            <div className="pi-icone">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 11V5a1 1 0 011-1h6l9 9-7 7-9-9z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="pi-recurso-titulo">Categorias e metas</div>
              <div className="pi-recurso-texto">
                Saiba para onde vai o dinheiro e quanto falta para a meta.
              </div>
            </div>
          </div>

          <div className="pi-recurso">
            <div className="pi-icone">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16V4m0 0L8 8m4-4l4 4M5 17v2a1 1 0 001 1h12a1 1 0 001-1v-2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="pi-recurso-titulo">Importar fatura</div>
              <div className="pi-recurso-texto">
                Envie o PDF ou CSV do banco e lance tudo de uma vez.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
