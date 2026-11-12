import { createHash, randomBytes } from "node:crypto";
import type { Banco } from "../database/conexao.js";

export const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;

// O banco guarda só o hash: quem ler o banco não consegue usar as sessões.
function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function criarRepositorioSessoes(db: Banco, agora: () => number = Date.now) {
  return {
    async criar(usuarioId: number) {
      const token = randomBytes(32).toString("base64url");
      const expiraEm = agora() + DURACAO_SESSAO_MS;
      // Uma única ida ao banco: limpa as expiradas e grava a nova juntas.
      await db.batch([
        { sql: "DELETE FROM sessoes WHERE expira_em <= ?", args: [agora()] },
        { sql: "INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)", args: [hashDoToken(token), usuarioId, expiraEm] },
      ], "write");
      return { token, expiraEm };
    },
    async buscarUsuarioId(token: string): Promise<number | undefined> {
      const { rows } = await db.execute({
        sql: "SELECT usuario_id FROM sessoes WHERE token_hash = ? AND expira_em > ?",
        args: [hashDoToken(token), agora()],
      });
      return rows[0] ? Number(rows[0].usuario_id) : undefined;
    },
    async remover(token: string): Promise<void> {
      await db.execute({ sql: "DELETE FROM sessoes WHERE token_hash = ?", args: [hashDoToken(token)] });
    },
  };
}

export type RepositorioSessoes = ReturnType<typeof criarRepositorioSessoes>;
