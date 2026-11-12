import { useEffect, useState } from "react";
import { ServicoDeCategorias, type Categoria } from "../services/ServicoDeCategorias";
import { SessaoExpiradaError } from "../services/ServicoDeAutenticacao";

export const LIMITE_NOME_CATEGORIA = 50;

export type ServicoDaTelaDeCategorias = Pick<ServicoDeCategorias, "listar" | "criar">;

// Fora do hook: uma instância nova a cada render dispararia o useEffect de novo.
const servicoPadrao = new ServicoDeCategorias();

/**
 * Estado e regras da tela de categorias: carrega a lista, valida e cria categorias
 * e avisa o App quando a API responde que a sessão expirou.
 */
export function useCategorias(aoSessaoExpirada: () => void, servico: ServicoDaTelaDeCategorias = servicoPadrao) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [erroNome, setErroNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    servico
      .listar()
      .then((lista) => { if (ativo) setCategorias(lista); })
      .catch((erro: Error) => {
        if (!ativo) return;
        if (erro instanceof SessaoExpiradaError) aoSessaoExpirada();
        else setErroLista(erro.message);
      })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [servico, aoSessaoExpirada]);

  async function salvar() {
    if (salvando) return;
    if (nome.trim() === "") {
      setErroNome("Informe o nome da categoria.");
      return;
    }
    if (nome.trim().length > LIMITE_NOME_CATEGORIA) {
      setErroNome(`O nome da categoria deve ter no máximo ${LIMITE_NOME_CATEGORIA} caracteres.`);
      return;
    }
    setErroNome("");
    setSalvando(true);
    try {
      const nova = await servico.criar(nome);
      setCategorias((atuais) => [...atuais, nova]);
      setNome("");
      setCriando(false);
    } catch (erro) {
      if (erro instanceof SessaoExpiradaError) return aoSessaoExpirada();
      setErroNome(erro instanceof Error ? erro.message : "Não foi possível criar a categoria.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirFormulario() {
    setCriando(true);
  }

  function cancelar() {
    setCriando(false);
    setNome("");
    setErroNome("");
  }

  return {
    categorias,
    carregando,
    erroLista,
    criando,
    nome,
    erroNome,
    salvando,
    alterarNome: setNome,
    abrirFormulario,
    cancelar,
    salvar,
  };
}
