import * as fs from "node:fs";
import * as path from "node:path";
import * as prettier from "prettier";
import { DefaultJsonSerializer, type LangiumCoreServices } from "langium";
import type { Model } from "../language/generated/ast.js";
import { extractDestinationAndName } from "./cli-util.js";

export async function dumpAst(
  model: Model,
  services: LangiumCoreServices,
  filePath: string,
  destination: string | undefined
): Promise<string> {
  const data = extractDestinationAndName(filePath, destination);
  const dumpFilePath = `${path.join(data.destination, data.name)}.json`;
  const serializer = new DefaultJsonSerializer(services);
  const jsonString = serializer.serialize(model);
  const formattedJsonString = await prettier.format(jsonString, {
    parser: "json",
  });
  console.log(formattedJsonString);

  if (!fs.existsSync(data.destination)) {
    fs.mkdirSync(data.destination, { recursive: true });
  }
  fs.writeFileSync(dumpFilePath, formattedJsonString);

  return dumpFilePath;
}
