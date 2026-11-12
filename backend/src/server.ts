import { createAppComBanco } from "./appComBanco.js";
import { abrirBanco } from "./database/conexao.js";
import { lerConfigBanco, lerCookieSeguro, lerPorta } from "./config.js";

async function iniciar() {
  const PORT = lerPorta(process.env);
  const cookieSeguro = lerCookieSeguro(process.env);
  const configBanco = lerConfigBanco(process.env);

  const banco = "url" in configBanco ? "Turso (remoto)" : "arquivo local";
  // Aplica as migrations antes de abrir a porta: o health check só responde com o banco pronto.
  const db = await abrirBanco(configBanco).catch((erro: unknown) => {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    throw new Error(`falha ao abrir o banco (${banco}): ${motivo}. Confira a URL, o token e a rede.`);
  });
  const app = createAppComBanco(db, { cookieSeguro, pastaFrontend: process.env.FRONTEND_DIR });

  // Sem host: escuta em todas as interfaces, como o Render e o Docker exigem.
  const server = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} (banco: ${banco}; cookie Secure: ${cookieSeguro ? "sim" : "não"})`);
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => server.close(() => db.close()));
  }
}

iniciar().catch((erro: unknown) => {
  // Só a mensagem: o erro completo do cliente pode trazer detalhes da conexão.
  console.error(`Não foi possível iniciar: ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
});
