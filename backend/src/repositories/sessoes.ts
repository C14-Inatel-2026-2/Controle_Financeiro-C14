import type { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";

export const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;

// O banco guarda só o hash: quem ler o arquivo SQLite não consegue usar as sessões.
function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function criarRepositorioSessoes(db: DatabaseSync, agora: () => number = Date.now) {
  return {
    criar(usuarioId: number) {
      const token = randomBytes(32).toString("base64url");
      const expiraEm = agora() + DURACAO_SESSAO_MS;
      db.prepare("DELETE FROM sessoes WHERE expira_em <= ?").run(agora());
      db.prepare("INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)")
        .run(hashDoToken(token), usuarioId, expiraEm);
      return { token, expiraEm };
    },
    buscarUsuarioId(token: string): number | undefined {
      const linha = db.prepare("SELECT usuario_id FROM sessoes WHERE token_hash = ? AND expira_em > ?")
        .get(hashDoToken(token), agora());
      return linha ? Number(linha.usuario_id) : undefined;
    },
    remover(token: string): void {
      db.prepare("DELETE FROM sessoes WHERE token_hash = ?").run(hashDoToken(token));
    },
  };
}

export type RepositorioSessoes = ReturnType<typeof criarRepositorioSessoes>;
