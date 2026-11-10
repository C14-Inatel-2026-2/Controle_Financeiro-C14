# Arquitetura da importação de faturas

Este diretório contém o núcleo da importação. HTTP e interface ficam nas
camadas de controllers/rotas e no frontend. O escopo de leitura possui
somente duas entradas:

1. arquivo de um banco conhecido, aceito apenas quando existe um profile
   cadastrado para banco, formato e versão do layout;
2. texto CSV manual no template `data;descricao;valor` para "Outro banco".

OFX e OCR não fazem parte da implementação. A API, a tela e a persistência
foram conectadas ao núcleo; a confirmação usa o usuário da sessão (`req.usuario.id`).
O Router expõe `GET /invoice-imports/options`, `POST /invoice-imports/preview`
e `POST /invoice-imports/confirm`. CSV é enviado como JSON com `content`;
PDF usa `mode: "known-bank"`, `bankId: "itau"` e `file` com `fileName`,
`base64` e `password` opcional. A confirmação reenvia a fonte e o `fingerprint`
da prévia; o usuário deve vir da autenticação no servidor.

A página inicial não oferece um atalho de importação. O acesso pela interface
fica no menu interno. A API de prévia continua pública para testes; retirar o
atalho não protege a rota. A confirmação exige uma sessão criada por
`POST /auth/login` e responde 401 sem ela (veja `docs/autenticacao.md`).

## O que significa cada tipo de arquivo

- **model (`domain/invoice.ts`)**: descreve os objetos de entrada e saída.
- **extractor**: lê o formato físico. PDF vira textos com coordenadas; CSV vira
  cabeçalho e linhas. Um extractor nunca contém regras de um banco.
- **profile**: interpreta o layout. Ele recebe a saída de um extractor e sabe
  quais textos ou colunas representam data, descrição e valor.
- **registry**: cataloga profiles, valida banco/formato e escolhe a versão do
  layout que reconhece os dados.
- **application service**: coordena as etapas e produz a pré-visualização.
- **config**: decide quais extractors e profiles realmente entram em produção.
- **template**: define e valida o CSV manual exibido para "Outro banco".

## Estrutura de pastas

```text
invoice-import/
├── index.ts                         API pública da leitura
├── application/
│   ├── invoice-import-service.ts    coordena os dois fluxos de leitura
│   └── invoice-import-workflow.ts   negativos, fingerprint e confirmação
├── config/
│   ├── create-default-invoice-import-service.ts
│   └── known-invoice-profiles.ts    catálogo: Itaú PDF v1 e v2
├── domain/
│   ├── invoice.ts                   modelos de entrada e saída
│   ├── invoice-errors.ts            erros específicos da feature
│   ├── invoice-import-repository.ts contrato de gravação e erros do workflow
│   ├── invoice-extractor.ts         contrato e saídas dos extractors
│   ├── invoice-profile.ts           contrato de todos os profiles
│   ├── invoice-profile-registry.ts  seleção segura de banco/layout
│   └── invoice-field-parsers.ts     data ISO e dinheiro em centavos
├── infrastructure/
│   ├── sqlite-invoice-import-repository.ts transação e vínculos com movimentações
│   ├── format-detection/
│   │   └── invoice-format-detector.ts
│   ├── extractors/
│   │   ├── csv/
│   │   │   ├── csv-invoice-extractor.ts
│   │   │   ├── decode-invoice-text.ts
│   │   │   └── delimited-text.ts
│   │   └── pdf/
│   │       └── pdf-invoice-extractor.ts
│   └── profiles/
│       ├── csv/
│       │   └── configurable-csv-profile.ts
│       └── itau/
│           ├── itau-pdf-v1-profile.ts
│           └── itau-pdf-v2-profile.ts
└── templates/
    └── standard-invoice-template.ts
```

## Caminho 1: PDF de banco conhecido

Exemplo atual: usuário seleciona Itaú e envia um PDF.

```text
controller -> InvoiceImportWorkflow.preview
  -> index.ts
  -> createDefaultInvoiceImportService()
  -> InvoiceImportService.preview(mode: "known-bank")
  -> InvoiceProfileRegistry.assertKnownBank("itau")
  -> InvoiceFormatDetector.detect(arquivo)             retorna "pdf"
  -> InvoiceProfileRegistry.assertSupportedFormat(...) aceita Itaú + PDF
  -> PdfInvoiceExtractor.extract(arquivo)               retorna páginas/textos
  -> InvoiceProfileRegistry.resolve(...)                escolhe v1 ou v2
  -> profile.map(...)                                   cria lançamentos
  -> InvoicePreview                                     ainda não persiste
```

O PDF não passa pelo parser CSV nem pelo template manual. O extractor PDF não
conhece o Itaú; o profile Itaú não recebe nem abre o arquivo binário.

### Layout Itaú Cartões v2

O profile v2 reconhece a identificação textual Itaú Cartões e os títulos de
resumo, compras e total atual. Percorre as seções de todas as páginas, inclusive
continuações com uma única coluna. Seções internacionais e de serviços são
opcionais. Pagamentos efetuados e parcelas futuras não são importados.

Alguns PDFs inserem espaços no meio dos títulos, datas e valores; o profile
remove esses espaços apenas para interpretar esses campos. Descrições conservam
os espaços entre palavras. A validação monetária do CSV permanece inalterada.

A soma é conferida com **Total dos lançamentos atuais**, e não com o saldo a
pagar, que pode incluir pagamentos anteriores. No layout v2, valores negativos
identificados exatamente como **Desc Antecipa Parcelas** são ajustes separados
desse subtotal. Eles são preservados entre os lançamentos lidos, mas não abatidos
da conferência do subtotal; outros créditos participam da conferência normalmente.
Depois, o workflow descarta todos os negativos e calcula o total das despesas
da prévia. Compras repetidas não são eliminadas. Divergências continuam causando erro.

Os testes unitários de v2 usam dados sintéticos e cobrem essas regras. O v1 e
sua amostra sintética continuam disponíveis. PDFs digitalizados e layouts que
não correspondam a nenhum dos profiles ainda não são suportados.

## Caminho 2: CSV manual

```text
controller -> InvoiceImportWorkflow.preview
  -> index.ts
  -> createDefaultInvoiceImportService()
  -> InvoiceImportService.preview(mode: "template")
  -> CsvInvoiceExtractor.extract(texto em memória)
  -> ConfigurableCsvProfile do template
  -> InvoicePreview
```

O CSV manual não passa pelo detector, pelo registry de bancos nem por qualquer
profile de banco conhecido.

## Como adicionar outro banco conhecido

Para um novo layout PDF, por exemplo `nubank-pdf-v1`:

1. criar `infrastructure/profiles/nubank/nubank-pdf-v1-profile.ts`;
2. implementar `InvoiceProfile` com `matches` e `map`;
3. criar testes sintéticos sem dados pessoais;
4. adicionar o profile em `config/known-invoice-profiles.ts`.

O novo profile reutiliza `PdfInvoiceExtractor`; não se cria outro leitor de PDF
para cada banco. Se o mesmo banco mudar o layout, deve ser criada uma nova
versão de profile (`v2`) em vez de misturar regras incompatíveis no `v1`.

Um formato físico novo só deve ser adicionado quando virar requisito real. Ele
exigirá um extractor próprio e testes antes de aparecer na aplicação.

## Limites entre responsabilidades

- Extractor não identifica banco.
- Profile não abre arquivo nem conhece senha.
- Registry não interpreta coordenadas ou colunas.
- Serviço não contém regra específica de layout.
- Nenhuma etapa persiste automaticamente a pré-visualização.
- Senhas não são persistidas. O navegador mantém a fonte em memória para
  revalidá-la na confirmação e a libera ao confirmar, alterar ou sair da tela.
- O workflow chama novamente o leitor antes de salvar. Somente seu método
  confirm aciona o repositório; preview permanece sem gravação.
