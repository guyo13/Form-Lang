export { faker as defaultFaker } from "@faker-js/faker";
export { default as ProbabilisticSearchFormGenerator } from "../generation/formGen.js";
import ProbabilisticSearchFormGenerator from "../generation/formGen.js";

export const DEFAULT_GENERATOR_HYPER_PARAMETERS = Object.freeze({
  alpha: 0.3,
  beta: 0.7,
  gamma: 0.2,
  delta: 0.4,
  epsilon: 0.5,
  D: 4,
  maxChildren: 6,
});

export function generateRandomFormPrompt(
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
