import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Categorias } from "./Categorias";
import { SessaoExpiradaError } from "../services/ServicoDeAutenticacao";

afterEach(cleanup);

type Servico = NonNullable<Parameters<typeof Categorias>[0]["servico"]>;

const usuario = { id: 1, nome: "Ana Teste", email: "ana@email.com" };

function abrir(servico: Servico, aoSessaoExpirada = vi.fn()) {
  render(
    <Categorias aoNavegar={vi.fn()} servico={servico} usuario={usuario} aoSair={vi.fn()} aoSessaoExpirada={aoSessaoExpirada} />,
  );
}

function digitarESalvar(nome: string) {
  fireEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));
  fireEvent.change(screen.getByPlaceholderText("Ex.: Alimentação"), { target: { value: nome } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
}

describe("Tela de categorias com API simulada", () => {
  it("mostra carregando e depois as categorias reais", async () => {
    abrir({ listar: vi.fn().mockResolvedValue([{ id: 1, name: "Lazer" }, { id: 2, name: "Saúde" }]), criar: vi.fn() });
    expect(screen.getByText("Carregando categorias...")).toBeTruthy();
    expect(await screen.findByText("Lazer")).toBeTruthy();
    expect(screen.getByText("Saúde")).toBeTruthy();
    expect(screen.getByText("2 categorias cadastradas")).toBeTruthy();
    expect(screen.queryByText("Carregando categorias...")).toBeNull();
  });

  it("mostra a lista vazia", async () => {
    abrir({ listar: vi.fn().mockResolvedValue([]), criar: vi.fn() });
    expect(await screen.findByText(/Nenhuma categoria ainda/)).toBeTruthy();
  });

  it("mostra o erro ao carregar", async () => {
    abrir({ listar: vi.fn().mockRejectedValue(new Error("Não foi possível carregar as categorias.")), criar: vi.fn() });
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar as categorias.");
    expect(screen.queryByText(/Nenhuma categoria ainda/)).toBeNull();
  });

  it("avisa o App quando a sessão expirou", async () => {
    const aoSessaoExpirada = vi.fn();
    abrir({ listar: vi.fn().mockRejectedValue(new SessaoExpiradaError()), criar: vi.fn() }, aoSessaoExpirada);
    await vi.waitFor(() => expect(aoSessaoExpirada).toHaveBeenCalledTimes(1));
  });

  it("cria uma categoria e a mostra na lista", async () => {
    const servico = { listar: vi.fn().mockResolvedValue([]), criar: vi.fn().mockResolvedValue({ id: 5, name: "Mercado" }) };
    abrir(servico);
    await screen.findByText(/Nenhuma categoria ainda/);
    digitarESalvar("Mercado");
    expect(await screen.findByText("Mercado")).toBeTruthy();
    expect(servico.criar).toHaveBeenCalledExactlyOnceWith("Mercado");
    expect(screen.getByText("1 categorias cadastradas")).toBeTruthy();
  });

  it("não chama a API com nome vazio", async () => {
    const servico = { listar: vi.fn().mockResolvedValue([]), criar: vi.fn() };
    abrir(servico);
    await screen.findByText(/Nenhuma categoria ainda/);
    digitarESalvar("   ");
    expect(screen.getByRole("alert").textContent).toBe("Informe o nome da categoria.");
    expect(servico.criar).not.toHaveBeenCalled();
  });

  it("mostra o erro de nome repetido e mantém o formulário", async () => {
    const servico = {
      listar: vi.fn().mockResolvedValue([{ id: 1, name: "Lazer" }]),
      criar: vi.fn().mockRejectedValue(new Error("A categoria Lazer já está cadastrada")),
    };
    abrir(servico);
    await screen.findByText("Lazer");
    digitarESalvar("Lazer");
    expect((await screen.findByRole("alert")).textContent).toBe("A categoria Lazer já está cadastrada");
    expect((screen.getByPlaceholderText("Ex.: Alimentação") as HTMLInputElement).value).toBe("Lazer");
  });
});

describe("Tela de categorias: comportamento preservado na extração do useCategorias", () => {
  const campo = () => screen.getByPlaceholderText("Ex.: Alimentação") as HTMLInputElement;
  const nomesNaTela = () => Array.from(document.querySelectorAll(".ap-categoria-texto")).map((item) => item.textContent);

  it("mantém a ordem da API e acrescenta a nova categoria no fim", async () => {
    const servico = {
      listar: vi.fn().mockResolvedValue([{ id: 2, name: "Saúde" }, { id: 1, name: "Lazer" }]),
      criar: vi.fn().mockResolvedValue({ id: 3, name: "Mercado" }),
    };
    abrir(servico);
    await screen.findByText("Saúde");
    expect(nomesNaTela()).toEqual(["Saúde", "Lazer"]);
    digitarESalvar("Mercado");
    await screen.findByText("Mercado");
    expect(nomesNaTela()).toEqual(["Saúde", "Lazer", "Mercado"]);
    expect(servico.listar).toHaveBeenCalledTimes(1);
  });

  it("fecha e limpa o formulário depois de criar", async () => {
    abrir({ listar: vi.fn().mockResolvedValue([]), criar: vi.fn().mockResolvedValue({ id: 5, name: "Mercado" }) });
    await screen.findByText(/Nenhuma categoria ainda/);
    digitarESalvar("Mercado");
    await screen.findByText("Mercado");
    expect(screen.queryByPlaceholderText("Ex.: Alimentação")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));
    expect(campo().value).toBe("");
  });

  it("cancela sem chamar a API e limpa nome e erro", async () => {
    const servico = { listar: vi.fn().mockResolvedValue([]), criar: vi.fn() };
    abrir(servico);
    await screen.findByText(/Nenhuma categoria ainda/);
    digitarESalvar("   ");
    expect(screen.getByRole("alert").textContent).toBe("Informe o nome da categoria.");
    fireEvent.change(campo(), { target: { value: "Rascunho" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByPlaceholderText("Ex.: Alimentação")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));
    expect(campo().value).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(servico.criar).not.toHaveBeenCalled();
  });

  it("não chama a API com nome acima de 50 caracteres", async () => {
    const servico = { listar: vi.fn().mockResolvedValue([]), criar: vi.fn() };
    abrir(servico);
    await screen.findByText(/Nenhuma categoria ainda/);
    digitarESalvar("a".repeat(51));
    expect(screen.getByRole("alert").textContent).toBe("O nome da categoria deve ter no máximo 50 caracteres.");
    expect(servico.criar).not.toHaveBeenCalled();
  });

  it("bloqueia o envio repetido enquanto salva", async () => {
    let concluir: (categoria: { id: number; name: string }) => void = () => {};
    const servico = {
      listar: vi.fn().mockResolvedValue([]),
      criar: vi.fn(() => new Promise<{ id: number; name: string }>((resolver) => { concluir = resolver; })),
    };
    abrir(servico);
    await screen.findByText(/Nenhuma categoria ainda/);
    digitarESalvar("Mercado");
    const botao = screen.getByRole("button", { name: "Salvando..." }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    fireEvent.submit(botao.closest("form")!);
    fireEvent.submit(botao.closest("form")!);
    expect(servico.criar).toHaveBeenCalledTimes(1);

    concluir({ id: 5, name: "Mercado" });
    expect(await screen.findByText("Mercado")).toBeTruthy();
    expect(servico.criar).toHaveBeenCalledTimes(1);
  });

  it("avisa o App quando a sessão expira ao criar, sem mostrar erro", async () => {
    const aoSessaoExpirada = vi.fn();
    const servico = { listar: vi.fn().mockResolvedValue([]), criar: vi.fn().mockRejectedValue(new SessaoExpiradaError()) };
    abrir(servico, aoSessaoExpirada);
    await screen.findByText(/Nenhuma categoria ainda/);
    digitarESalvar("Mercado");
    await vi.waitFor(() => expect(aoSessaoExpirada).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("usa a mensagem padrão quando a criação falha sem um Error", async () => {
    abrir({ listar: vi.fn().mockResolvedValue([]), criar: vi.fn().mockRejectedValue("falha") });
    await screen.findByText(/Nenhuma categoria ainda/);
    digitarESalvar("Mercado");
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível criar a categoria.");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeTruthy();
  });
});
