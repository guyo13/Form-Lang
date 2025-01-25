import chalk from "chalk";
import TreeSitterParser, { TreeCursor } from "tree-sitter";
import * as JavaScriptTreeSitter from "tree-sitter-javascript";
import { Command } from "commander";
import * as prettier from "prettier";
import type { Model } from "../language/generated/ast.js";
import { FormLangLanguageMetaData } from "../language/generated/module.js";
import { createFormLangServices } from "../language/form-lang-module.js";
import { extractAstNode } from "./cli-util.js";
import { NodeFileSystem } from "langium/node";
import * as url from "node:url";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { dumpAst } from "./dump-ast.js";
import { ReactCompiler } from "../compiler/reactCompiler.js";
import { ICompilerConfig } from "../compiler/compilerConfig.js";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const packagePath = path.resolve(__dirname, "..", "..", "package.json");
const packageContent = await fs.readFile(packagePath, "utf-8");

function formatJsSource(source: string): Promise<string> {
  return prettier.format(source, {
    parser: "typescript",
  });
}

function checkJsAst(source: string): boolean {
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

export const generateReactAction = async (
  fileName: string,
  opts: GenerateReactOptions,
): Promise<void> => {
  const services = createFormLangServices(NodeFileSystem).FormLang;
  const model = await extractAstNode<Model>(fileName, services);
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
        stateManagement: {
          valuePropName: "value",
          valueSetterPropName: "valueSetter",
        },
      },
      my_comp2: {
        path: "",
        importSymbolName: "default",
        importSymbolAlias: "MyComp2",
        stateManagement: {
          valuePropName: "value",
          valueSetterPropName: "valueSetter",
        },
      },
      mynestedform: {
        path: "",
        importSymbolName: "default",
        importSymbolAlias: "MyNestedForm",
      },
    },
    stateManagementConfig: {
      singleStateStore: opts.singleStateStore,
    },
  } satisfies ICompilerConfig;
  const reactCompiler = new ReactCompiler(config);
  let compilerOutput;
  try {
    compilerOutput = reactCompiler.compileModel(model);
    if (compilerOutput.status === "error") {
      for (const error of compilerOutput.errors) {
        console.error(chalk.red(error));
      }
      return;
    } else {
      for (const [formName, compileOutput] of Object.entries(
        compilerOutput.output,
      )) {
        let formattedComponent, formattedSliceCreator;
        formattedComponent = await formatJsSource(
          compileOutput.formComponentCode,
        );
        formattedSliceCreator = await formatJsSource(
          compileOutput.formSliceCreatorCode ??
            `//No formSliceCreatorCode for form '${formName}'`,
        );
        console.log(formattedComponent);
        console.log(formattedSliceCreator);
        if (opts.validate) {
          const jsSource = formattedComponent + "\n" + formattedSliceCreator;
          const isValid = checkJsAst(jsSource);
          console.log(
            isValid
              ? chalk.green(`Generated JSX is valid`)
              : chalk.red("Generated JSX contains errors!"),
          );
        }
      }
    }
  } catch (err) {
    console.error(err);
    console.error(chalk.red(err));
    return;
  }
};

export const dumpAstAction = async (
  fileName: string,
  opts: GenerateOptions,
): Promise<void> => {
  const services = createFormLangServices(NodeFileSystem).FormLang;
  const model = await extractAstNode<Model>(fileName, services);
  const dumpFilePath = await dumpAst(
    model,
    services,
    fileName,
    opts.destination,
  );
  console.log(chalk.green(`Ast successfully exported: ${dumpFilePath}`));
};

export const generateDataAction = async (
  fileName: string,
  opts: GenerateOptions,
): Promise<void> => {
  const services = createFormLangServices(NodeFileSystem).FormLang;
  try {
    // TODO - Implement
    console.log(services, opts);
  } catch (err) {
    console.error(err);
    console.error(chalk.red(err));
    return;
  }
};

export interface GenerateOptions {
  destination?: string;
}

export interface GenerateReactOptions extends GenerateOptions {
  validate: boolean;
  singleStateStore: boolean;
}

export default function (): void {
  const program = new Command();

  program.version(JSON.parse(packageContent).version);

  const fileExtensions = FormLangLanguageMetaData.fileExtensions.join(", ");
  program
    .command("dump-ast")
    .argument(
      "<file>",
      `source file (possible file extensions: ${fileExtensions})`,
    )
    .option("-d, --destination <dir>", "destination directory for the output")
    .description("Dumps the AST of a given source file into JSON.")
    .action(dumpAstAction);
  program
    .command("gen-react")
    .argument(
      "<file>",
      `source file (possible file extensions: ${fileExtensions})`,
    )
    .option("-d, --destination <dir>", "destination directory for the output")
    .option("--validate", "whether tree sitter validation should be run", false)
    .option(
      "--singleStateStore",
      "whether we should generate a single store to manage states for all forms in the file",
      false,
    )
    .description("")
    .action(generateReactAction);
  program
    .command("gen-data")
    .argument("<file>", `Generation parameters JSON file`)
    .option("-d, --destination <dir>", "destination directory for the output")
    .description("")
    .action(generateDataAction);
  program.parse(process.argv);
}
