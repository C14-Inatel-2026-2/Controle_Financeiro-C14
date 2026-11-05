import { createAppComBanco } from "./appComBanco.js";
import { abrirBanco } from "./database/conexao.js";

const db = abrirBanco(process.env.DATABASE_PATH);
const app = createAppComBanco(db);

const PORT = 3000;

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close(() => db.close()));
}
