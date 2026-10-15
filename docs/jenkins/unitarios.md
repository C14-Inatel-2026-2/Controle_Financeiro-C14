# Job de testes unitários — Igor

## Preparação

Siga a instalação em [README.md](README.md). O job `backend-unit-igor` é criado automaticamente por `infra/jenkins/jobs.groovy`. Se já houver uma instalação, reconstrua as imagens depois de atualizar os arquivos de infraestrutura.

O pipeline está em `backend/Jenkinsfile.unit`. O agente deve estar conectado com a label `node24`.

## Executar

1. Envie os arquivos desta configuração para `Branch-Igor` no GitHub.
2. Abra http://localhost:8081 e entre com seu usuário local.
3. Abra `backend-unit-igor` > **Build with Parameters**.
4. Use `Branch-Igor` no parâmetro `BRANCH` e inicie o build.
5. Confira o commit no console, o resultado do build e **Test Result**.

O job faz checkout da branch publicada, instala com `npm ci` e executa `npm run test:unit`. Arquivos locais ainda não enviados não entram na execução. O relatório `backend/reports/unit/junit.xml` é publicado e arquivado mesmo quando os testes falham. Uma saída não zero do comando faz o build falhar.

## Demonstrar uma falha

Em uma execução controlada da sua branch, crie temporariamente `backend/tests/unit/jenkins-failure.test.ts`:

```typescript
import { expect, test } from 'vitest';
test('verifica falha do job', () => {
  expect(1).toBe(2);
});
```

Faça commit e push, execute o job e registre o resultado **FAILURE** e o teste no relatório. Remova apenas esse arquivo temporário, faça novo commit e push e execute novamente para confirmar **SUCCESS**. Não envie a falha proposital para a main. Guarde os números das duas execuções e os commits correspondentes.

## Escopo

A configuração seleciona `tests/unit/**/*.test.ts`. Os testes com banco real ficam em `tests/integration` e pertencem ao job de integração. Não altere o job de integração ou frontend para esta entrega.
