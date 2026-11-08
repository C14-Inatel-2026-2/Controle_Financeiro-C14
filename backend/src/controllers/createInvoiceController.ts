import type { Request, Response } from "express";
import {
  AmbiguousInvoiceLayoutError, InvalidInvoiceFileError, InvalidInvoicePasswordError,
  InvoiceParseError, InvoicePasswordRequiredError, InvoiceTotalMismatchError,
  UnknownInvoiceLayoutError, UnsupportedBankError, UnsupportedBankFormatError,
  UnsupportedInvoiceFormatError,
} from "../features/invoice-import/index.js";
import {
  DuplicateInvoiceError, InvoiceConfirmationUnavailableError, InvoicePreviewChangedError,
  InvoiceUserRequiredError,
} from "../features/invoice-import/domain/invoice-import-repository.js";
import type { InvoiceImportWorkflow } from "../features/invoice-import/application/invoice-import-workflow.js";
import { INVOICE_LIMITS, InvoiceRequestError, isObject, lerEntradaFatura } from "./lerEntradaFatura.js";

// Este adaptador deve consultar uma sessão/token já validado pelo módulo de autenticação.
// Nunca deve simplesmente devolver um ID recebido no corpo ou em um cabeçalho do cliente.
export type InvoiceIdentity = (request: Request) => number | undefined;
type InvoiceActions = Pick<InvoiceImportWorkflow, "preview" | "confirm" | "getOptions" | "canConfirm">;

export function respondInvoiceError(res: Pick<Response, "status" | "json">, error: unknown) {
  let status = 500;
  let codigo = "INTERNAL_ERROR";
  let mensagem = "Não foi possível processar a fatura.";
  if (error instanceof InvoiceRequestError) {
    status = 400; codigo = "VALIDATION_ERROR"; mensagem = error.message;
  } else if (error instanceof DuplicateInvoiceError) {
    status = 409; codigo = "DUPLICATE_INVOICE"; mensagem = "Esta fatura já foi importada por este usuário.";
  } else if (error instanceof InvoicePreviewChangedError) {
    status = 409; codigo = "PREVIEW_CHANGED"; mensagem = "O conteúdo mudou. Gere uma nova prévia.";
  } else if (error instanceof InvoiceConfirmationUnavailableError) {
    status = 503; codigo = "CONFIRMATION_UNAVAILABLE"; mensagem = "A confirmação aguarda a integração com a autenticação.";
  } else if (error instanceof InvoiceUserRequiredError) {
    status = 401; codigo = "AUTHENTICATION_REQUIRED"; mensagem = "Autentique-se para confirmar a importação.";
  } else if (error instanceof UnsupportedBankError || error instanceof UnsupportedBankFormatError || error instanceof UnsupportedInvoiceFormatError) {
    status = 415; codigo = "UNSUPPORTED_INVOICE"; mensagem = error.message;
  } else if (error instanceof InvoicePasswordRequiredError || error instanceof InvalidInvoicePasswordError) {
    status = 422; codigo = "PDF_PASSWORD_ERROR"; mensagem = error.message;
  } else if (error instanceof InvoiceParseError || error instanceof InvalidInvoiceFileError ||
      error instanceof InvoiceTotalMismatchError || error instanceof UnknownInvoiceLayoutError || error instanceof AmbiguousInvoiceLayoutError) {
    status = 422; codigo = "INVALID_INVOICE_DATA"; mensagem = error.message;
  }
  res.status(status).json({ erro: { codigo, mensagem } });
}

export function createInvoiceController(workflow: InvoiceActions, identity?: InvoiceIdentity) {
  return {
    options(_req: Request, res: Pick<Response, "status" | "json">) {
      try {
        res.json({
          ...workflow.getOptions(),
          limits: INVOICE_LIMITS,
          confirmationAvailable: Boolean(identity && workflow.canConfirm),
        });
      } catch (error) { respondInvoiceError(res, error); }
    },
    async preview(req: Pick<Request, "body">, res: Pick<Response, "status" | "json">) {
      try {
        res.status(200).json(await workflow.preview(lerEntradaFatura(req.body)));
      } catch (error) { respondInvoiceError(res, error); }
    },
    async confirm(req: Request, res: Pick<Response, "status" | "json">) {
      try {
        if (!identity || !workflow.canConfirm) throw new InvoiceConfirmationUnavailableError();
        const userId = identity(req);
        if (!userId || !Number.isSafeInteger(userId) || userId <= 0) throw new InvoiceUserRequiredError();
        const body: unknown = req.body;
        if (!isObject(body) || typeof body.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(body.fingerprint)) {
          throw new InvoiceRequestError("Informe o fingerprint recebido na prévia.");
        }
        res.status(201).json(await workflow.confirm(userId, lerEntradaFatura(body), body.fingerprint));
      } catch (error) { respondInvoiceError(res, error); }
    },
  };
}
