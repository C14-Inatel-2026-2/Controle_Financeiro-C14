# PDF sintético protegido por senha

`itau-v2-com-senha.pdf` é uma amostra fixa para verificar a leitura real de PDF
protegido no fluxo de importação. O arquivo contém texto selecionável, uma
página e títulos e posições compatíveis com o perfil `itau-pdf-v2`.

- **Senha de abertura:** `c14-pdf-teste`.
- **Proteção:** AES-256, com senha exigida para abrir o documento.
- **Titular fictício:** Cristiano Ronaldo.
- **Vencimento:** 06/07/2026.
- **Resultado esperado:** duas despesas, total de R$ 30,00 (3000 centavos).

| Data extraída | Descrição | Valor em centavos |
|---|---|---:|
| 2026-06-10 | MERCADO EXEMPLO | 1000 |
| 2026-06-12 | LOJA EXEMPLO | 2000 |

## Origem e privacidade

O documento foi criado do zero com dados inventados, usando ReportLab 4.4.9 e
pypdf 6.21.4. Não é uma fatura pessoal anonimizada e não foi emitido pelo Itaú.
Não contém CPF, conta, número de cartão, endereço ou código de pagamento.
Os metadados identificam somente o projeto e a finalidade de teste; as fontes
Bitstream Vera estão incorporadas para a leitura não depender das fontes da máquina.

A senha de proprietário também é fictícia: `c14-proprietario-teste`. As duas
senhas são públicas e exclusivas desta amostra; não são credenciais da aplicação.
O gerador não faz parte do projeto. Não é necessário instalar Python ou qualquer
biblioteca de geração para usar o arquivo ou executar os testes unitários.

## Verificação funcional pela interface

Com a aplicação executando e uma conta de teste autenticada:

1. Abra **Importar fatura** e escolha **Itaú - PDF**.
2. Selecione `itau-v2-com-senha.pdf` desta pasta.
3. Gere a prévia sem preencher a senha: deve aparecer
   **A fatura PDF está protegida e requer uma senha**.
4. Tente novamente usando `incorreta`: deve aparecer
   **A senha informada para a fatura PDF está incorreta**.
5. Use `c14-pdf-teste`: a prévia deve conter as duas despesas da tabela e total
   de R$ 30,00. O campo de senha fica vazio após a prévia bem-sucedida.

A prévia não grava despesas. Se confirmar a importação em um ambiente de teste,
as duas despesas serão gravadas. Uma segunda confirmação da mesma fatura pelo
mesmo usuário deve ser rejeitada como duplicada. A senha de abertura não deve
aparecer nas respostas da API nem nas despesas gravadas.

## Verificação funcional pela API

Os comandos abaixo são para PowerShell, executados na pasta `backend`, com a API
rodando. A porta padrão é 3000; ajuste a URL se a instância usar outra porta.
Eles chamam somente a prévia, sem gravar despesas.

```powershell
$arquivo = (Resolve-Path 'tests/fixtures/invoice-import/itau-v2-com-senha.pdf').Path
$url = 'http://localhost:3000/api/invoice-imports/preview'
$entrada = @{
    mode = 'known-bank'
    bankId = 'itau'
    file = @{
        fileName = 'itau-v2-com-senha.pdf'
        base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($arquivo))
        password = 'c14-pdf-teste'
    }
}

# Senha correta: HTTP 200, duas despesas e totalInCents = 3000.
Invoke-RestMethod -Method Post -Uri $url -ContentType 'application/json' `
    -Body ($entrada | ConvertTo-Json -Depth 5)

# Senha incorreta: HTTP 422, PDF_PASSWORD_ERROR e mensagem de senha incorreta.
$entrada.file.password = 'incorreta'
Invoke-RestMethod -Method Post -Uri $url -ContentType 'application/json' `
    -Body ($entrada | ConvertTo-Json -Depth 5)

# Senha ausente: HTTP 422, PDF_PASSWORD_ERROR e mensagem solicitando a senha.
[void]$entrada.file.Remove('password')
Invoke-RestMethod -Method Post -Uri $url -ContentType 'application/json' `
    -Body ($entrada | ConvertTo-Json -Depth 5)
```

Nas duas chamadas negativas, `Invoke-RestMethod` apresenta um erro HTTP. Isso é
esperado: confira o status 422 e a mensagem, em vez de considerar qualquer erro
como aprovação do cenário.

## Testes unitários e alcance da amostra

Na pasta `backend`, execute `npm run test:unit`.

O arquivo `pdf-invoice-extractor.test.ts` simula o PDF.js em três casos:

1. Encaminha a senha correta e retorna o texto extraído.
2. Informa que a senha é necessária quando ela não foi enviada.
3. Informa que a senha enviada está incorreta.

Os três casos também verificam a liberação da tarefa de leitura.

Esses testes são descobertos pelo comando unitário já usado no Jenkins. Eles não
abrem esta amostra e não comprovam a descriptografia real. Para isso, use a
verificação funcional descrita acima, com o PDF.js real da aplicação.

A amostra cobre um PDF textual com AES-256 e layout Itaú v2. Ela não comprova
compatibilidade com todos os algoritmos de criptografia, layouts bancários ou
PDFs digitalizados. Não há gerador permanente nem novo job do Jenkins.
