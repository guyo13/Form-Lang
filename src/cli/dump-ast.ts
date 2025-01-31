import * as fs from "node:fs";
import * as path from "node:path";
import * as prettier from "prettier";
import type { LangiumCoreServices } from "langium";
import type { Model } from "../language/generated/ast.js";
import {
  extractAstNode,
  extractDestinationAndName,
  GenerateOptions,
} from "./cli-util.js";
import { serializeAst } from "../lib/language.js";
import { createFormLangServices } from "../language/form-lang-module.js";
import { NodeFileSystem } from "langium/node";
import chalk from "chalk";

export async function dumpAst(
  model: Model,
  services: LangiumCoreServices,
  filePath: string,
  destination: string | undefined,
): Promise<string> {
  const data = extractDestinationAndName(filePath, destination);
  const dumpFilePath = `${path.join(data.destination, data.name)}.json`;
  const json = serializeAst(model, services);
  const formattedJsonString = await prettier.format(json, {
    parser: "json",
  });
  console.log(formattedJsonString);

  if (!fs.existsSync(data.destination)) {
    fs.mkdirSync(data.destination, { recursive: true });
  }
  fs.writeFileSync(dumpFilePath, formattedJsonString);

  return dumpFilePath;
}

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
