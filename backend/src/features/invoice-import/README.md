# Arquitetura da importação de faturas

Este diretório contém toda a feature de importação. O escopo atual possui
somente duas entradas:

1. arquivo de um banco conhecido, aceito apenas quando existe um profile
   cadastrado para banco, formato e versão do layout;
2. texto CSV manual no template `data;descricao;valor` para "Outro banco".

OFX, OCR, persistência, upload HTTP e interface visual não fazem parte desta
implementação.

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
├── index.ts                         API pública para controllers futuros
├── application/
│   └── invoice-import-service.ts    coordena os dois fluxos
├── config/
│   ├── create-default-invoice-import-service.ts
│   └── known-invoice-profiles.ts    catálogo: atualmente só Itaú PDF v1
├── domain/
│   ├── invoice.ts                   modelos de entrada e saída
│   ├── invoice-errors.ts            erros específicos da feature
│   ├── invoice-extractor.ts         contrato e saídas dos extractors
│   ├── invoice-profile.ts           contrato de todos os profiles
│   ├── invoice-profile-registry.ts  seleção segura de banco/layout
│   └── invoice-field-parsers.ts     data ISO e dinheiro em centavos
├── infrastructure/
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
│           └── itau-pdf-v1-profile.ts
└── templates/
    └── standard-invoice-template.ts
```

## Caminho 1: PDF de banco conhecido

Exemplo atual: usuário seleciona Itaú e envia um PDF.

```text
controller futuro
  -> index.ts
  -> createDefaultInvoiceImportService()
  -> InvoiceImportService.preview(mode: "known-bank")
  -> InvoiceProfileRegistry.assertKnownBank("itau")
  -> InvoiceFormatDetector.detect(arquivo)             retorna "pdf"
  -> InvoiceProfileRegistry.assertSupportedFormat(...) aceita Itaú + PDF
  -> PdfInvoiceExtractor.extract(arquivo)               retorna páginas/textos
  -> InvoiceProfileRegistry.resolve(...)                escolhe itau-pdf-v1
  -> ItauPdfV1Profile.map(...)                           cria lançamentos
  -> InvoicePreview                                     ainda não persiste
```

O PDF não passa pelo parser CSV nem pelo template manual. O extractor PDF não
conhece o Itaú; o profile Itaú não recebe nem abre o arquivo binário.

## Caminho 2: CSV manual

```text
controller futuro
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
- Senhas de PDF existem somente durante a chamada do extractor.
