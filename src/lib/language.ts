import { createFormLangServices } from "../language/form-lang-module.js";
import {
  DefaultJsonSerializer,
  EmptyFileSystem,
  type LangiumCoreServices,
  LangiumDocument,
} from "langium";
import { parseHelper } from "langium/test";
import { Model } from "../language/generated/ast.js";
import type { Diagnostic } from "vscode-languageserver-types";

export class ParsingErrors extends Error {
  readonly errors: Diagnostic[];

  constructor(errors: Diagnostic[], message: string) {
    super(message);
    this.errors = errors;
  }
}

export function getDocumentErrors(document: LangiumDocument): Diagnostic[] {
  return (document.diagnostics ?? []).filter((e) => e.severity === 1);
}

export function getFormLangStringParser() {
  const services = createFormLangServices(EmptyFileSystem);

  return parseHelper<Model>(services.FormLang);
}

export function serializeAst(
  model: Model,
  services: LangiumCoreServices,
): string {
  const serializer = new DefaultJsonSerializer(services);
  return serializer.serialize(model);
}
