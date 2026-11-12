# Banco de dados (SQLite / libSQL)

O backend usa o cliente oficial [`@libsql/client`](https://docs.turso.tech/sdk/ts/quickstart),
compatível com SQLite, num único caminho de acesso a dados:

| Configuração | Banco |
| --- | --- |
| Nenhuma variável do Turso | Arquivo local: `DATABASE_PATH` ou `data/financeiro.sqlite` (relativo à pasta em que o processo foi iniciado). Na imagem Docker, `/data/financeiro.sqlite`, no volume. |
| `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` | Somente o Turso (hospedagem no Render). Falha de conexão encerra a aplicação, sem voltar para o arquivo local. |

`lerConfigBanco()` (`src/config.ts`) valida as variáveis: só uma delas, URL sem `libsql://`
ou `https://`, ou `RENDER=true` sem Turso impedem a aplicação de subir, com mensagem clara
e sem repetir o token. A publicação está no [guia do deploy](../../../docs/ci-cd/deploy.md#hospedagem-pública-no-render-com-turso).

`abrirBanco()` é assíncrona: abre o banco, aplica as migrations 1 a 6 uma única vez cada
(usuários e movimentações, metas, importações de faturas, sessões, categorias e metas por
usuário) e devolve o cliente. `:memory:` é usado nos testes. Feche com `db.close()` ao encerrar a aplicação.

```typescript
const db = await abrirBanco();                       // ou abrirBanco(lerConfigBanco(process.env))
const repositorio = criarRepositorioMovimentacoes(db);
const movimentos = await repositorio.listar(usuarioAutenticado.id);
```

- **Migrations:** cada versão roda num `batch(..., "write")`, que é uma transação: os comandos
  e o registro em `migrations` entram juntos ou nenhum entra. Os comandos são os mesmos da
  versão com `node:sqlite`, então bancos existentes abrem sem mudança (verificado com uma cópia
  de um banco local). Nunca altere uma migration já aplicada: crie uma versão nova.
- **Chaves estrangeiras:** o libSQL as aplica por padrão. Os testes confirmam que uma
  movimentação de usuário inexistente é recusada.
- **Transações:** a confirmação de faturas grava a importação, as despesas e os vínculos num
  único `batch` "write". Uma falha desfaz tudo. A chave `UNIQUE (usuario_id, fingerprint)`
  impede a mesma fatura duas vezes, inclusive em confirmações simultâneas. Não use
  `db.transaction()` interativa: com o arquivo local, ela bloqueia outras escritas
  (`SQLITE_BUSY`), e no Turso exige várias idas e voltas.
- **Todas as operações são assíncronas** (`await`) até as rotas.

A tabela usuarios guarda somente senha_hash. A tabela sessoes (migration 4) guarda
o hash do token de cada login. Veja `docs/autenticacao.md`.
O repositório recebe o ID da sessão autenticada: não aceite usuarioId vindo do cliente.
Consultas SQL usam parâmetros. As movimentações retornadas usam valorEmCentavos,
compatível com calcularSaldo. A confirmação de faturas grava os lançamentos como movimentações
do usuário da sessão. As rotas HTTP de movimentações estão em `docs/categorias.md`.

Metas são persistidas na tabela `metas`, criada pela migration 2 e vinculada ao usuário
pela migration 6. Metas antigas permanecem com `usuario_id NULL`, sem aparecer para
nenhuma conta; novos cadastros usam o usuário da sessão. Veja o
[contrato da API e a regra de progresso da US05](../../../docs/us05-metas-financeiras.md).

Testes: `npm test -- tests/integration` (inclui `invoice-import-repository.test.ts`, com transação, rollback e duplicidade),
sempre com libSQL local (memória ou pasta temporária), sem rede e sem token. No Windows, o
libSQL só libera o arquivo depois que o coletor de lixo finaliza os comandos, por isso a
limpeza das pastas temporárias tolera falhas (`tests/helpers/banco.ts`). Compilação: `npm run build`.

Não envie o arquivo do banco, nem cópias `.dump`, ao GitHub: eles contêm dados pessoais.
