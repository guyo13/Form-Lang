import { createFormLangServices } from "../language/form-lang-module.js";
import { NodeFileSystem } from "langium/node";
import {
  checkJsAst,
  extractAstNode,
  formatJsSource,
  GenerateOptions,
} from "./cli-util.js";
import type { Model } from "../language/generated/ast.js";
import { ICompilerConfig } from "../compiler/compilerConfig.js";
import { ReactCompiler } from "../compiler/reactCompiler.js";
import chalk from "chalk";

export interface GenerateReactOptions extends GenerateOptions {
  validate: boolean;
  singleStateStore: boolean;
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
