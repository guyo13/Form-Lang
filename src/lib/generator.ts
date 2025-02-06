import type { Faker } from "@faker-js/faker";
import { faker as defaultFaker } from "@faker-js/faker";
export { faker as defaultFaker } from "@faker-js/faker";
export { default as ProbabilisticSearchFormGenerator } from "../generation/formGen.js";
import ProbabilisticSearchFormGenerator, {
  ProbabilisticSearchParams,
} from "../generation/formGen.js";
import { getFormLangStringParser, hasErrors } from "./language.js";

export const DEFAULT_GENERATOR_HYPER_PARAMETERS = Object.freeze({
  alpha: 0.3,
  beta: 0.7,
  gamma: 0.2,
  delta: 0.4,
  epsilon: 0.5,
  D: 4,
  maxChildren: 6,
});

export async function newFormGen(
  params: ProbabilisticSearchParams,
  formComponentsCode: string,
  fieldComponentsCode: string,
  faker: Faker = defaultFaker,
) {
  const parser = getFormLangStringParser();
  const formComponents = await parser(formComponentsCode);
  const fieldComponents = await parser(fieldComponentsCode);
  if (hasErrors(formComponents)) {
    throw new Error("formComponentsCode failed with errors");
  } else if (hasErrors(fieldComponents)) {
    throw new Error("fieldComponents failed with errors");
  }

  return new ProbabilisticSearchFormGenerator(
    params,
    faker,
    formComponents.parseResult.value.components,
    fieldComponents.parseResult.value.components,
  );
}

export function generateRandomFormPromptData(
  formGen: ProbabilisticSearchFormGenerator,
) {
  const form = formGen.generateForm();
  const serializedForm = formGen.toFormLang(form);
  const { removedNode, removedNodeContext } = formGen.removeRandomNode(form);
  const serializedModifiedForm = formGen.toFormLang(form);
  const removedNodeEnglish = formGen.toEnglish(removedNode);
  const removedNodeContextEnglish = formGen
    .removedNodeContextToEnglishStatements(removedNodeContext)
    .filter(Boolean)
    .map((s) => "* " + s)
    .join("\n");
  formGen.clear();

  return {
    form,
    serializedForm,
    removedNode,
    removedNodeContext,
    serializedModifiedForm,
    removedNodeEnglish,
    removedNodeContextEnglish,
  };
}
