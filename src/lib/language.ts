import { createFormLangServicesWithoutLsp } from "../language/form-lang-module.js";
import { EmptyFileSystem, URI } from "langium";
import type {
  LangiumCoreServices,
  LangiumDocument,
  AstNode,
  BuildOptions,
  ParserOptions,
} from "langium";
import { Model, Form } from "../language/generated/ast.js";
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

/** Copied from langium-test. This returns a parse function that IS NOT SAFE to use if a clean context is required between subsequent parses! */
export function parseHelper<T extends AstNode = AstNode>(
  services: LangiumCoreServices,
): (
  input: string,
  options?: ParseHelperOptions,
) => Promise<LangiumDocument<T>> {
  let nextDocumentId = 1;
  const metaData = services.LanguageMetaData;
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
    await services.shared.workspace.DocumentBuilder.build([document], options);
    return document;
  };
}

export function getDocumentErrors(document: LangiumDocument): Diagnostic[] {
  return (document.diagnostics ?? []).filter((e) => e.severity === 1);
}

export function hasErrors(document: LangiumDocument): boolean {
  return getDocumentErrors(document).length > 0;
}

export function getFormLangStringParser(
  services = createFormLangServicesWithoutLsp(EmptyFileSystem),
) {
  return parseHelper<Model>(services.FormLang);
}

export function getServices() {
  return createFormLangServicesWithoutLsp(EmptyFileSystem);
}

export function serializeAst(
  model: Model | Form,
  services: LangiumCoreServices,
): string {
  return services.serializer.JsonSerializer.serialize(model);
}

/** We assume that the source code contain only Form definition (single one per source code) and that the related components appear in the source code given in formComponentsCode and fieldComponentsCode */
export async function computeAndSerializeAst(
  sourceCode: string,
  shouldCheckErrors: boolean = false,
) {
  const services = createFormLangServicesWithoutLsp(EmptyFileSystem);
  const stringParser = getFormLangStringParser(services);
  const parsed = await stringParser(sourceCode);
  let errors;
  if (shouldCheckErrors) {
    errors =
      await services.FormLang.validation.DocumentValidator.validateDocument(
        parsed,
        {
          stopAfterLexingErrors: false,
          stopAfterLinkingErrors: false,
          stopAfterParsingErrors: false,
        },
      );
  }

  return {
    ast: serializeAst(parsed.parseResult.value.forms[0], services.FormLang),
    errors,
  };
}
