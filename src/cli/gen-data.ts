import { getFormLangStringParser } from "../lib/language.js";
import { GenerateOptions, parseFormLangString } from "./cli-util.js";
import ProbabilisticSearchFormGenerator from "../generation/formGen.js";
import {
  DEFAULT_GENERATOR_HYPER_PARAMETERS,
  generateRandomFormPromptData,
} from "../lib/index.js";
import { faker } from "@faker-js/faker";
import chalk from "chalk";

export const generateDataAction = async (
  fileName: string,
  opts: GenerateOptions,
): Promise<void> => {
  const parser = getFormLangStringParser();
  const fieldComponentsDocument = await parseFormLangString(
    `
  component myTextBox {
    props {
      textColor
      textSize
      textWeight
      borderColor
    }
  }
  component myCheckbox {
    props {
      size
    }
  }
  component otherTextBox {}
  component counter {
    props {
      style
    }
  }
  `,
    parser,
  );
  const formComponentsDocument = await parseFormLangString(
    `
  component userDetailsContainer {}
  component formContainer {}
  component someOtherContainer {}
  component OtherContainer2 {}
  `,
    parser,
  );
  const formGen = new ProbabilisticSearchFormGenerator(
    DEFAULT_GENERATOR_HYPER_PARAMETERS,
    faker,
    formComponentsDocument.parseResult.value.components,
    fieldComponentsDocument.parseResult.value.components,
  );
  try {
    const {
      serializedForm,
      removedNode,
      removedNodeContext,
      serializedModifiedForm,
      removedNodeEnglish,
      removedNodeContextEnglish,
    } = generateRandomFormPromptData(formGen);
    console.log("// serializedForm");
    console.log(serializedForm);
    console.log("// serializedModifiedForm");
    console.log(serializedModifiedForm);
    console.log("// removedNode");
    console.dir(removedNode);
    console.log("// removedNode English");
    console.dir(removedNodeEnglish);
    console.log("// removedNodeContext");
    console.dir(removedNodeContext);
    console.log("// removedNodeContext English");
    console.dir(removedNodeContextEnglish);
  } catch (err) {
    console.error(err);
    console.error(chalk.red(err));
    return;
  }
};
