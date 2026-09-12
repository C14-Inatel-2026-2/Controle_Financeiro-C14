import type { NovoUsuario, Usuario } from "../../src/models/user";
import type { UserRepository } from "../../src/repositories/userRepository";

export class FakeUserRepository implements UserRepository {
  readonly usuarios: Array<NovoUsuario & { id: number }> = [];

  async buscarPorEmail(email: string): Promise<Usuario | undefined> {
    const normalizar = (valor: string) => valor.replace(/[A-Z]/g, (letra) => letra.toLowerCase());
    const usuario = this.usuarios.find((item) => normalizar(item.email) === normalizar(email));
    if (!usuario) return undefined;
    return { id: usuario.id, nome: usuario.nome, email: usuario.email };
  }

  async inserir(usuario: NovoUsuario): Promise<number> {
    if (await this.buscarPorEmail(usuario.email)) throw new Error("E-mail já cadastrado.");
    const id = this.usuarios.length + 1;
    this.usuarios.push({ ...usuario, id });
    return id;
  }
}
