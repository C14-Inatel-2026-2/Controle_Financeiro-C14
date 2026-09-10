import express from "express";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("api funcionando");
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
