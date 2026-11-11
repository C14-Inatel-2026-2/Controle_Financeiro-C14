import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Login } from "./Login";
import type { Usuario } from "../services/ServicoDeCadastro";

afterEach(cleanup);

const usuario = { id: 1, nome: "Ana Teste", email: "ana@email.com" };

function abrir(entrar: (email: string, senha: string) => Promise<Usuario>, aoEntrar = vi.fn()) {
  render(<Login aoEntrar={aoEntrar} aoCriarConta={vi.fn()} servico={{ entrar }} />);
  return aoEntrar;
}

function preencherEEnviar(email = "ana@email.com", senha = "senha-ana-123") {
  fireEvent.change(screen.getByPlaceholderText("voce@email.com"), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText("Sua senha"), { target: { value: senha } });
  fireEvent.click(screen.getByRole("button", { name: /Entra/ }));
}

describe("Tela de login com API simulada", () => {
  it("entra só depois que a API confirma o login", async () => {
    let responder: (valor: typeof usuario) => void = () => {};
    const entrar = vi.fn(() => new Promise<typeof usuario>((r) => { responder = r; }));
    const aoEntrar = abrir(entrar);
    preencherEEnviar();

    expect(entrar).toHaveBeenCalledExactlyOnceWith("ana@email.com", "senha-ana-123");
    expect(aoEntrar).not.toHaveBeenCalled();
    // Enquanto espera, o botão fica bloqueado e um novo envio é ignorado.
    const botao = screen.getByRole("button", { name: "Entrando..." }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    fireEvent.submit(botao.closest("form")!);
    expect(entrar).toHaveBeenCalledTimes(1);

    responder(usuario);
    await vi.waitFor(() => expect(aoEntrar).toHaveBeenCalledExactlyOnceWith(usuario));
  });

  it("senha errada ou e-mail inexistente mostram o erro e não entram", async () => {
    const aoEntrar = abrir(vi.fn().mockRejectedValue(new Error("E-mail ou senha incorretos.")));
    preencherEEnviar("ninguem@inexistente.test", "x");
    expect((await screen.findByRole("alert")).textContent).toBe("E-mail ou senha incorretos.");
    expect(aoEntrar).not.toHaveBeenCalled();
  });

  it("falha de rede mostra o erro e permite tentar de novo", async () => {
    const entrar = vi.fn()
      .mockRejectedValueOnce(new Error("Não foi possível entrar. Tente novamente."))
      .mockResolvedValueOnce(usuario);
    const aoEntrar = abrir(entrar);
    preencherEEnviar();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível entrar. Tente novamente.");
    expect((screen.getByRole("button", { name: "Entrar" }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await vi.waitFor(() => expect(aoEntrar).toHaveBeenCalledExactlyOnceWith(usuario));
    expect(entrar).toHaveBeenCalledTimes(2);
  });

  it("não chama a API com o formulário vazio", () => {
    const entrar = vi.fn();
    abrir(entrar);
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(screen.getByText("Informe sua senha.")).toBeTruthy();
    expect(entrar).not.toHaveBeenCalled();
  });
});
