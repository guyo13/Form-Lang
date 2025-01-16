import chalk from "chalk";
import TreeSitterParser, { TreeCursor } from "tree-sitter";
import * as JavaScriptTreeSitter from "tree-sitter-javascript";
import { Command } from "commander";
import * as prettier from "prettier";
import type { Model } from "../language/generated/ast.js";
import { FormLangLanguageMetaData } from "../language/generated/module.js";
import { createFormLangServices } from "../language/form-lang-module.js";
import { extractAstNode } from "./cli-util.js";
import { generateJavaScript } from "./generator.js";
import { NodeFileSystem } from "langium/node";
import * as url from "node:url";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { dumpAst } from "./dump-ast.js";
import { ReactCompiler } from "../compiler/reactCompiler.js";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const packagePath = path.resolve(__dirname, "..", "..", "package.json");
const packageContent = await fs.readFile(packagePath, "utf-8");

export const generateAction = async (
  fileName: string,
  opts: GenerateOptions
): Promise<void> => {
  const services = createFormLangServices(NodeFileSystem).FormLang;
  const model = await extractAstNode<Model>(fileName, services);
  const generatedFilePath = generateJavaScript(
    model,
    fileName,
    opts.destination
  );
  console.log(
    chalk.green(`JavaScript code generated successfully: ${generatedFilePath}`)
  );
};

export const generateReactAction = async (
  fileName: string,
  opts: GenerateReactOptions
): Promise<void> => {
  const services = createFormLangServices(NodeFileSystem).FormLang;
  const model = await extractAstNode<Model>(fileName, services);
  const firstForm = model.forms[0];
  // TODO Load from file
  const config = {
    components: {
      myform: {
        path: "",
        importSymbolName: "MyForm",
      },
      my_comp: {
        path: "",
        importSymbolName: "default",
        importSymbolAlias: "MyComp",
      },
      mynestedform: {
        path: "",
        importSymbolName: "default",
        importSymbolAlias: "MyNestedForm",
      },
    },
  };
  const reactCompiler = new ReactCompiler(config);
  const component = reactCompiler.generateForm(firstForm);
  const formattedComponent = await prettier.format(component, {
    parser: "typescript",
  });
  console.log(formattedComponent);
  if (opts.validate) {
    const parser = new TreeSitterParser();
    //@ts-ignore
    parser.setLanguage(JavaScriptTreeSitter.default);
    const tree = parser.parse(formattedComponent);
    let isValid = true;

    const treeCursor = tree.walk();
    function traverse(cursor: TreeCursor) {
      if (cursor.nodeType === "ERROR") {
        isValid = false;
        console.error(
          `Syntax error detected: ${cursor.currentNode.text}`,
          `at (${cursor.startPosition.row}:${cursor.startPosition.column})`
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

    console.log(
      isValid
        ? chalk.green(`Generated JSX is valid`)
        : chalk.red("Generated JSX contains errors!")
    );
  }
  // const dumpFilePath = dumpAst(model, services, fileName, opts.destination);
  // console.log(chalk.green(`Ast successfully exported: ${dumpFilePath}`));
};

export const dumpAstAction = async (
  fileName: string,
  opts: GenerateOptions
): Promise<void> => {
  const services = createFormLangServices(NodeFileSystem).FormLang;
  const model = await extractAstNode<Model>(fileName, services);
  const dumpFilePath = dumpAst(model, services, fileName, opts.destination);
  console.log(chalk.green(`Ast successfully exported: ${dumpFilePath}`));
};

export interface GenerateOptions {
  destination?: string;
}

export interface GenerateReactOptions extends GenerateOptions {
  validate?: boolean;
}

export default function (): void {
  const program = new Command();

  program.version(JSON.parse(packageContent).version);

  const fileExtensions = FormLangLanguageMetaData.fileExtensions.join(", ");
  program
    .command("generate")
    .argument(
      "<file>",
      `source file (possible file extensions: ${fileExtensions})`
    )
    .option("-d, --destination <dir>", "destination directory of generating")
    .description(
      'generates JavaScript code that prints "Hello, {name}!" for each greeting in a source file'
    )
    .action(generateAction);
  program
    .command("dump-ast")
    .argument(
      "<file>",
      `source file (possible file extensions: ${fileExtensions})`
    )
    .option("-d, --destination <dir>", "destination directory for the output")
    .description("Dumps the AST of a given source file into JSON.")
    .action(dumpAstAction);
  program
    .command("gen-react")
    .argument(
      "<file>",
      `source file (possible file extensions: ${fileExtensions})`
    )
    .option("-d, --destination <dir>", "destination directory for the output")
    .option("--validate", "whether tree sitter validation should be run")
    .description("")
    .action(generateReactAction);
  program.parse(process.argv);
}
