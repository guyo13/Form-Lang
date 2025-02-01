import { createFormLangServicesWithoutLsp } from "../language/form-lang-module.js";
import { EmptyFileSystem, URI } from "langium";
import type {
  LangiumCoreServices,
  LangiumDocument,
  AstNode,
  BuildOptions,
  ParserOptions,
} from "langium";
import { Model } from "../language/generated/ast.js";
import type { Diagnostic } from "vscode-languageserver-types";

export class ParsingErrors extends Error {
  readonly errors: Diagnostic[];

  constructor(errors: Diagnostic[], message: string) {
    super(message);
    this.errors = errors;
  }
}

/** Copied from langium-test */
export interface ParseHelperOptions extends BuildOptions {
  /**
   * Specifies the URI of the generated document. Will use a counter variable if not specified.
   */
  documentUri?: string;
  /**
   * Options passed to the LangiumParser.
   */
  parserOptions?: ParserOptions;
}

/** Copied from langium-test */
let nextDocumentId = 1;
/** Copied from langium-test */
export function parseHelper<T extends AstNode = AstNode>(
  services: LangiumCoreServices,
): (
  input: string,
  options?: ParseHelperOptions,
) => Promise<LangiumDocument<T>> {
  const metaData = services.LanguageMetaData;
  const documentBuilder = services.shared.workspace.DocumentBuilder;
  return async (input, options = { validation: true }) => {
    const uri = URI.parse(
      options?.documentUri ??
        `file:///${nextDocumentId++}${metaData.fileExtensions[0] ?? ""}`,
    );
    const document =
      services.shared.workspace.LangiumDocumentFactory.fromString<T>(
        input,
        uri,
        options?.parserOptions,
      );
    services.shared.workspace.LangiumDocuments.addDocument(document);
    await documentBuilder.build([document], options);
    return document;
  };
}

export function getDocumentErrors(document: LangiumDocument): Diagnostic[] {
  return (document.diagnostics ?? []).filter((e) => e.severity === 1);
}

export function hasErrors(document: LangiumDocument): boolean {
  return getDocumentErrors(document).length > 0;
}

export function getFormLangStringParser() {
  const services = createFormLangServicesWithoutLsp(EmptyFileSystem);

  return parseHelper<Model>(services.FormLang);
}

export function getServices() {
  return createFormLangServicesWithoutLsp(EmptyFileSystem);
}

export function serializeAst(
  model: Model,
  services: LangiumCoreServices,
): string {
  return services.serializer.JsonSerializer.serialize(model);
}
