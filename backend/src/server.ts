import { createApp } from "./app.js";
import { abrirBanco } from "./database/conexao.js";
import { createSqliteGoalRepository } from "./features/goals/infrastructure/sqlite-goal-repository.js";

const db = abrirBanco(process.env.DATABASE_PATH);
const app = createApp(createSqliteGoalRepository(db));

const PORT = 3000;

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close(() => db.close()));
}
