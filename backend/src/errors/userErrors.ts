export class ValidationError extends Error {
  readonly campo?: string;

  constructor(mensagem: string, campo?: string) {
    super(mensagem);

    this.name = "ValidationError";
    this.campo = campo;
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("E-mail já cadastrado.");
    this.name = "EmailAlreadyExistsError";
  }
}