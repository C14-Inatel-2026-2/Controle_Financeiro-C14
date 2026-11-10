import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Categorias } from "./Categorias";

afterEach(cleanup);

type Servico = NonNullable<Parameters<typeof Categorias>[0]["servico"]>;

function abrir(servico: Servico) {
  render(<Categorias aoNavegar={vi.fn()} servico={servico} />);
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
    abrir({ listar: vi.fn().mockRejectedValue(new Error("Faça login para ver suas categorias.")), criar: vi.fn() });
    expect((await screen.findByRole("alert")).textContent).toBe("Faça login para ver suas categorias.");
    expect(screen.queryByText(/Nenhuma categoria ainda/)).toBeNull();
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
