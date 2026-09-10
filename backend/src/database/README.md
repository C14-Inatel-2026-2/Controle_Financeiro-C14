# SQLite

Requer Node.js 22.13 ou superior com node:sqlite disponível (experimental no Node 22).
Usa o SQLite incluído no Node, sem dependências adicionais.

`abrirBanco()` abre `data/financeiro.sqlite` relativo à pasta em que o processo foi iniciado,
habilita as chaves estrangeiras e aplica a migration 1 uma única vez.
Passe um caminho absoluto para escolher outro local; `:memory:` é usado nos testes.
Feche a conexão com `db.close()` ao encerrar a aplicação.

```typescript
const db = abrirBanco();
const repositorio = criarRepositorioMovimentacoes(db);
const movimentos = repositorio.listar(usuarioAutenticado.id);
```

A tabela usuarios guarda somente senha_hash. O módulo de autenticação deve gerar
um hash apropriado antes de cadastrar o usuário. Esta entrega não implementa login.
O repositório recebe o ID da sessão autenticada: não aceite usuarioId vindo do cliente.
Consultas SQL usam parâmetros. As movimentações retornadas usam valorEmCentavos,
compatível com calcularSaldo. A importação de faturas ainda não está conectada ao banco.

Testes: `npm test -- tests/unit/database.test.ts`. Compilação: `npm run build`.
Não envie o arquivo do banco, que pode conter dados pessoais, ao GitHub.
