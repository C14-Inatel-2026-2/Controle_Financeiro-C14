import { useState } from "react";
import { validarCadastro, type ErrosCadastro } from "../utils/validarCadastro";

export function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<ErrosCadastro>({});
  const [sucesso, setSucesso] = useState(false);

  function cadastrar() {
    const novosErros = validarCadastro({ nome, email, senha });
    setErros(novosErros);
    setSucesso(Object.keys(novosErros).length === 0);
  }

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        cadastrar();
      }}
      noValidate
    >
      <h1>Criar conta</h1>

      <label>
        Nome
        <input value={nome} onChange={(e) => setNome(e.target.value)} />
      </label>
      {erros.nome && <p className="erro">{erros.nome}</p>}

      <label>
        E-mail
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {erros.email && <p className="erro">{erros.email}</p>}

      <label>
        Senha
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </label>
      {erros.senha && <p className="erro">{erros.senha}</p>}

      <button type="submit">Cadastrar</button>

      {sucesso && <p className="sucesso">Cadastro válido!</p>}
    </form>
  );
}