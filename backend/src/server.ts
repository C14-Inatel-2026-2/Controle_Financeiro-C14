import { createAppComBanco } from "./appComBanco.js";
import { abrirBanco } from "./database/conexao.js";
import { lerCookieSeguro, lerPorta } from "./config.js";

const PORT = lerPorta(process.env);
const cookieSeguro = lerCookieSeguro(process.env);

const db = abrirBanco(process.env.DATABASE_PATH);
const app = createAppComBanco(db, { cookieSeguro, pastaFrontend: process.env.FRONTEND_DIR });

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} (cookie Secure: ${cookieSeguro ? "sim" : "não"})`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close(() => db.close()));
}
