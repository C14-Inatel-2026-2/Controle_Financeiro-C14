import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Cadastro } from "./Cadastro";

afterEach(cleanup);

const usuario = { id: 1, nome: "Ana", email: "ana@email.com" };

function preencher(nome = "Ana", email = "ana@email.com", senha = "12345678") {
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: nome } });
  fireEvent.change(screen.getByPlaceholderText("voce@email.com"), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText("Mínimo de 8 caracteres"), { target: { value: senha } });
}

function enviar() {
  fireEvent.click(screen.getByRole("button", { name: /Cadastra/ }));
}

describe("Tela de cadastro com API simulada", () => {
  it("não chama a API quando o formulário é inválido", () => {
    const servico = { cadastrar: vi.fn() };
    render(<Cadastro aoEntrar={vi.fn()} servico={servico} />);
    preencher("", "email-invalido", "123");
    enviar();
    expect(screen.getByText("Informe seu nome.")).toBeTruthy();
    expect(servico.cadastrar).not.toHaveBeenCalled();
  });

  it("mostra sucesso só depois que a API responde", async () => {
    let responder: (valor: typeof usuario) => void = () => {};
    const servico = { cadastrar: vi.fn(() => new Promise<typeof usuario>((r) => { responder = r; })) };
    render(<Cadastro aoEntrar={vi.fn()} servico={servico} />);
    preencher();
    enviar();
    expect(servico.cadastrar).toHaveBeenCalledExactlyOnceWith({ nome: "Ana", email: "ana@email.com", senha: "12345678" });
    expect(screen.queryByText(/Conta criada/)).toBeNull();
    responder(usuario);
    expect(await screen.findByText(/Conta criada/)).toBeTruthy();
  });

  it("mostra a mensagem de e-mail duplicado", async () => {
    const servico = { cadastrar: vi.fn().mockRejectedValue(new Error("Este e-mail já está cadastrado.")) };
    render(<Cadastro aoEntrar={vi.fn()} servico={servico} />);
    preencher();
    enviar();
    expect((await screen.findByRole("alert")).textContent).toBe("Este e-mail já está cadastrado.");
    expect(screen.queryByText(/Conta criada/)).toBeNull();
  });

  it("mostra uma mensagem clara em falha geral", async () => {
    const servico = { cadastrar: vi.fn().mockRejectedValue(new Error("Não foi possível cadastrar. Tente novamente.")) };
    render(<Cadastro aoEntrar={vi.fn()} servico={servico} />);
    preencher();
    enviar();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível cadastrar. Tente novamente.");
  });

  it("bloqueia envio repetido enquanto aguarda a API", async () => {
    let responder: (valor: typeof usuario) => void = () => {};
    const servico = { cadastrar: vi.fn(() => new Promise<typeof usuario>((r) => { responder = r; })) };
    render(<Cadastro aoEntrar={vi.fn()} servico={servico} />);
    preencher();
    enviar();
    const botao = screen.getByRole("button", { name: "Cadastrando..." }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    fireEvent.submit(botao.closest("form")!);
    expect(servico.cadastrar).toHaveBeenCalledTimes(1);
    responder(usuario);
    await screen.findByText(/Conta criada/);
    expect((screen.getByRole("button", { name: "Cadastrar" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
