import { rmSync } from "node:fs";
import type { Client, InValue } from "@libsql/client";

// Consulta direta para os testes conferirem o que ficou gravado no banco libSQL.
export async function linhas(db: Pick<Client, "execute">, sql: string, ...args: InValue[]) {
  return (await db.execute({ sql, args })).rows.map((linha) => ({ ...linha }));
}

// No Windows, o libSQL só solta o arquivo quando o coletor de lixo finaliza os comandos
// preparados, mesmo depois de close(). No Linux (Jenkins, Docker, Render) a remoção é imediata.
// Uma pasta temporária que sobra no Windows não afeta o resultado dos testes.
export function removerPastaTemporaria(pasta: string): void {
  try {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 3 });
  } catch (erro) {
    if (process.platform !== "win32") throw erro;
  }
}
