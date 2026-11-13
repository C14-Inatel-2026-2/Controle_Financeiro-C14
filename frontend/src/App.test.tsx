import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ana = { id: 1, nome: "Ana Teste", email: "ana@email.com" };
const bia = { id: 2, nome: "Bia Souza", email: "bia@email.com" };

function servicoFalso(atual: typeof ana | null) {
  return {
    usuarioAtual: vi.fn().mockResolvedValue(atual),
    entrar: vi.fn(),
    sair: vi.fn().mockResolvedValue(undefined),
  };
}

function entrarPelaTela(email: string) {
  fireEvent.change(screen.getByPlaceholderText("voce@email.com"), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText("Sua senha"), { target: { value: "senha-123" } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("App: sessão e acesso às telas internas", () => {
  it("abre metas pelo atalho da Home e trata sessão expirada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    render(<App servico={servicoFalso(ana)} />);
    await screen.findByText("Olá, Ana.");
    fireEvent.click(screen.getByRole("button", { name: /Metas\s*Quanto falta/ }));
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Sua sessão expirou. Entre novamente.");
  });
  it("não mostra nenhuma tela enquanto consulta a sessão", () => {
    const servico = servicoFalso(null);
    servico.usuarioAtual.mockReturnValue(new Promise(() => {}));
    render(<App servico={servico} />);
    expect(screen.getByRole("status").textContent).toBe("Carregando...");
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("com sessão válida recupera o usuário e mostra nome e iniciais", async () => {
    render(<App servico={servicoFalso(ana)} />);
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Olá, Ana.");
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.getByText("AT")).toBeTruthy();
    expect(screen.queryByText("Donatto")).toBeNull();
  });

  it("sem sessão fica na área pública e o login real abre a área interna", async () => {
    const servico = servicoFalso(null);
    servico.entrar.mockResolvedValue(ana);
    render(<App servico={servico} />);

    await screen.findAllByRole("button", { name: "Entrar" });
    expect(screen.queryByRole("button", { name: "Sair" })).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Entrar" })[0]);
    entrarPelaTela("ana@email.com");
    expect(await screen.findByRole("heading", { name: "Olá, Ana." })).toBeTruthy();
  });

  it("Sair chama a API, volta ao login e a próxima conta não vê o nome anterior", async () => {
    const servico = servicoFalso(ana);
    servico.entrar.mockResolvedValue(bia);
    render(<App servico={servico} />);
    await screen.findByText("Olá, Ana.");

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeTruthy();
    expect(servico.sair).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Ana")).toBeNull();

    entrarPelaTela("bia@email.com");
    expect(await screen.findByText("Olá, Bia.")).toBeTruthy();
    expect(screen.getByText("BS")).toBeTruthy();
    expect(screen.queryByText(/Ana/)).toBeNull();
  });

  it("com sessão, o logo leva ao Início sem encerrar a sessão", async () => {
    const servico = servicoFalso(ana);
    render(<App servico={servico} />);
    await screen.findByText("Olá, Ana.");

    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(screen.queryByText("Olá, Ana.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Controle Financeiro" }));
    expect(screen.getByText("Olá, Ana.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Importar fatura" }));
    fireEvent.click(await screen.findByRole("button", { name: "Controle Financeiro" }));
    expect(await screen.findByText("Olá, Ana.")).toBeTruthy();
    expect(servico.sair).not.toHaveBeenCalled();
  });

  it("sem sessão, o logo e o Voltar ao início levam à página inicial pública", async () => {
    render(<App servico={servicoFalso(null)} />);
    const paginaInicial = () => screen.findByRole("button", { name: "Já tenho conta" });

    fireEvent.click(await paginaInicial());
    fireEvent.click(screen.getByRole("button", { name: "Controle Financeiro" }));
    fireEvent.click(await paginaInicial());
    fireEvent.click(screen.getByRole("button", { name: "← Voltar ao início" }));

    await paginaInicial();

    fireEvent.click(screen.getAllByRole("button", { name: "Criar conta" })[0]);
    expect(screen.getByRole("heading", { name: "Criar conta" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "← Voltar ao início" }));
    fireEvent.click((await screen.findAllByRole("button", { name: "Criar conta" }))[0]);
    fireEvent.click(screen.getByRole("button", { name: "Controle Financeiro" }));
    expect(await paginaInicial()).toBeTruthy();
  });

  it("se o logout falhar, continua conectado e mostra o erro", async () => {
    const servico = servicoFalso(ana);
    servico.sair.mockRejectedValue(new Error("Não foi possível sair. Tente novamente."));
    render(<App servico={servico} />);
    await screen.findByText("Olá, Ana.");

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível sair. Tente novamente.");
    expect(screen.getByText("Olá, Ana.")).toBeTruthy();
  });

  it("sessão expirada numa tela protegida volta ao login e limpa a conta", async () => {
    // A tela de categorias usa o serviço real; a API simulada responde 401.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));
    render(<App servico={servicoFalso(ana)} />);
    await screen.findByText("Olá, Ana.");

    fireEvent.click(screen.getAllByRole("button", { name: /Categorias/ })[0]);
    expect((await screen.findByRole("status")).textContent).toBe("Sua sessão expirou. Entre novamente.");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Entrar");
    expect(screen.queryByText("Ana")).toBeNull();
  });
});
