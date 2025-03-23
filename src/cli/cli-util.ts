import * as path from "node:path";
import * as fs from "node:fs";
import { AstNode, LangiumCoreServices, LangiumDocument, URI } from "langium";
import chalk from "chalk";
import TreeSitterParser, { TreeCursor } from "tree-sitter";
import * as JavaScriptTreeSitter from "tree-sitter-javascript";
import * as prettier from "prettier";
import { Model } from "../language/generated/ast.js";
import { getDocumentErrors, getFormLangStringParser } from "../lib/language.js";

export async function extractDocument(
  fileName: string,
  services: LangiumCoreServices,
): Promise<LangiumDocument> {
  const extensions = services.LanguageMetaData.fileExtensions;
  if (!extensions.includes(path.extname(fileName))) {
    console.error(
      chalk.yellow(
        `Please choose a file with one of these extensions: ${extensions}.`,
      ),
    );
    process.exit(1);
  }

  if (!fs.existsSync(fileName)) {
    console.error(chalk.red(`File ${fileName} does not exist.`));
    process.exit(1);
  }

  const document =
    await services.shared.workspace.LangiumDocuments.getOrCreateDocument(
      URI.file(path.resolve(fileName)),
    );
  await services.shared.workspace.DocumentBuilder.build([document], {
    validation: true,
  });

  handleValidationErrors(document);

  return document;
}

function handleValidationErrors(document: LangiumDocument) {
  const validationErrors = getDocumentErrors(document);
  if (validationErrors.length > 0) {
    console.error(chalk.red("There are validation errors:"));
    for (const validationError of validationErrors) {
      console.error(
        chalk.red(
          `line ${validationError.range.start.line + 1}: ${
            validationError.message
          } [${document.textDocument.getText(validationError.range)}]`,
        ),
      );
    }
    process.exit(1);
  }
}

export async function extractAstNode<T extends AstNode>(
  fileName: string,
  services: LangiumCoreServices,
): Promise<T> {
  return (await extractDocument(fileName, services)).parseResult?.value as T;
}

export async function parseFormLangString(
  input: string,
  parser: ReturnType<typeof getFormLangStringParser>,
): Promise<LangiumDocument<Model>> {
  const document = await parser(input);
  handleValidationErrors(document);

  return document;
}

interface FilePathData {
  destination: string;
  name: string;
}

export function extractDestinationAndName(
  filePath: string,
  destination: string | undefined,
): FilePathData {
  filePath = path.basename(filePath, path.extname(filePath));
  return {
    destination: destination ?? path.join(path.dirname(filePath), "generated"),
    name: path.basename(filePath),
  };
}

export function formatJsSource(source: string): Promise<string> {
  return prettier.format(source, {
    parser: "typescript",
  });
}

export function checkJsAst(source: string): boolean {
  let isValid = true;
  const parser = new TreeSitterParser();
  //@ts-ignore
  parser.setLanguage(JavaScriptTreeSitter.default);
  const tree = parser.parse(source);

  const treeCursor = tree.walk();

  function traverse(cursor: TreeCursor) {
    if (cursor.nodeType === "ERROR") {
      isValid = false;
      console.error(
        chalk.red(
          `Syntax error detected: ${cursor.currentNode.text}`,
          `at (${cursor.startPosition.row}:${cursor.startPosition.column})`,
        ),
      );
    }

    // Move to the first child and traverse it
    if (cursor.gotoFirstChild()) {
      do {
        traverse(cursor); // Recurse into each child
      } while (cursor.gotoNextSibling()); // Move to the next sibling
      cursor.gotoParent(); // Return to the parent node after traversing all children
    }
  }

  traverse(treeCursor);

  return isValid;
}

export interface GenerateOptions {
  destination?: string;
}
