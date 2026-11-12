import type { Client, InStatement } from "@libsql/client";

// O mesmo cliente libSQL atende o arquivo local (testes, desenvolvimento e Docker com volume)
// e o Turso (hospedagem). Repositórios recebem só a parte que usam.
export type Banco = Pick<Client, "execute" | "batch">;

// Cada migration roda num batch "write": os comandos e o registro da versão entram juntos
// ou nenhum entra. Se duas instâncias migrarem ao mesmo tempo, a chave da tabela migrations
// faz a segunda falhar sem alterar o esquema.
export async function aplicarMigration(db: Banco, versao: number, comandos: string[]): Promise<void> {
  const aplicada = await db.execute({ sql: "SELECT versao FROM migrations WHERE versao = ?", args: [versao] });
  if (aplicada.rows.length > 0) return;
  const lote: InStatement[] = [...comandos, { sql: "INSERT INTO migrations (versao) VALUES (?)", args: [versao] }];
  await db.batch(lote, "write");
}
