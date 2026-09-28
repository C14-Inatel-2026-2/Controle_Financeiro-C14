export class ValidationError extends Error {
  readonly campo?: string;

  constructor(mensagem: string, campo?: string) {
    super(mensagem);

    this.name = "ValidationError";
    this.campo = campo;
  }
}