import { Command } from "commander";
import { FormLangLanguageMetaData } from "../language/generated/module.js";
import * as url from "node:url";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { dumpAstAction } from "./dump-ast.js";
import { generateDataAction } from "./gen-data.js";
import { generateReactAction } from "./gen-react.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const packagePath = path.resolve(__dirname, "..", "..", "package.json");
const packageContent = await fs.readFile(packagePath, "utf-8");

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
