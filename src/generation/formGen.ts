import { z } from "zod";
import type { Faker } from "@faker-js/faker";
import { NodeState, traverseDFS } from "@guyo13/langium-utils/traversal";
import type { BuiltInType, ComponentDef } from "../language/generated/ast.js";
import { RANDOM_JS_EXPRESSIONS } from "./data.js";

const probabilitySchema = z.number().min(0).lt(1);
const integerSchema = z.number().min(0).int();

export const probabilisticSearchParamsSchema = z.object({
  alpha: probabilitySchema,
  beta: probabilitySchema,
  gamma: probabilitySchema.optional().default(0),
  delta: probabilitySchema.optional().default(0),
  epsilon: probabilitySchema.optional().default(0),
  zeta: probabilitySchema.optional().default(0.9),
  D: integerSchema.optional(),
  minChildren: integerSchema.optional().default(0),
  maxChildren: integerSchema.min(1).default(2),
  amin: integerSchema.min(0).default(0),
  amax: integerSchema.min(0).default(3),
  formIdMinLength: integerSchema.min(2).default(3),
  formIdMaxLength: integerSchema.min(2).default(10),
  fieldIdMinLength: integerSchema.min(2).default(3),
  fieldIdMaxLength: integerSchema.min(2).default(10),
});

export interface ProbabilisticSearchParams {
  alpha: number;
  beta: number;
  gamma?: number;
  delta?: number;
  epsilon?: number;
  zeta?: number; // The base probability to retain a node
  D?: number;
  minChildren?: number;
  maxChildren?: number;
  amin?: number;
  amax?: number;
  formIdMinLength?: number;
  formIdMaxLength?: number;
  fieldIdMinLength?: number;
  fieldIdMaxLength?: number;
}

type Component = ComponentDef;

export interface RandomValueExpression {
  expr: string;
  isAsExpression: boolean;
}

export interface IFieldComponent {
  component: Component;
  propAssignments: Record<string, RandomValueExpression>;
}

export interface IForm {
  readonly $type: "Form";
  name: string;
  component: IFieldComponent;
  children: Array<IFormChild> | null;
  depth: number;
}

export interface IFieldState {
  type: BuiltInType;
  isArray: boolean;
  defaultValue: RandomValueExpression | null;
}

export interface IField {
  readonly $type: "Field";
  name: string;
  component: IFieldComponent;
  state: IFieldState | null;
  depth: number;
}

export type IFormChild = IForm | IField;

export type FormLangNodeState = NodeState<
  IFormChild,
  {
    code: string;
  }
>;

export type RemoveNodeAlgorithmNodeState = NodeState<
  IFormChild,
  {
    parent: RemoveNodeAlgorithmNodeState | null;
  }
>;

export interface RemovedNodeContext {
  parent: IFormChild | null;
  before: IFormChild | null;
  after: IFormChild | null;
}

export default class ProbabilisticSearchFormGenerator {
  readonly params: ProbabilisticSearchParams;
  readonly faker: Faker;
  readonly ids: Set<string>;
  readonly availableFormComponentIds: Array<Component>;
  readonly availableFieldComponentIds: Array<Component>;
  static readonly BUILTIN_STATE_TYPES: Readonly<Array<BuiltInType>> =
    Object.freeze(["boolean", "number", "string"]);

  constructor(
    params: ProbabilisticSearchParams,
    faker: Faker,
    availableFormComponentIds: Array<Component>,
    availableFieldComponentIds: Array<Component>,
  ) {
    this.params = probabilisticSearchParamsSchema.parse(params);
    this.faker = faker;
    this.availableFormComponentIds = availableFormComponentIds;
    this.availableFieldComponentIds = availableFieldComponentIds;
    this.ids = new Set();
    this.clear = this.clear.bind(this);
    this.generateForm = this.generateForm.bind(this);
    this.randomForm = this.randomForm.bind(this);
    this.randomField = this.randomField.bind(this);
    this.getChildren = this.getChildren.bind(this);
    this.randomChildren = this.randomChildren.bind(this);
    this.toFormLang = this.toFormLang.bind(this);
    this.removeRandomNode = this.removeRandomNode.bind(this);
    this.toEnglish = this.toEnglish.bind(this);
    this.removedNodeContextToEnglishStatements =
      this.removedNodeContextToEnglishStatements.bind(this);
    this.idToEnglish = this.idToEnglish.bind(this);
    this.formToEnglish = this.formToEnglish.bind(this);
    this.fieldToEnglish = this.fieldToEnglish.bind(this);
    this.fieldComponentDefToEnglish =
      this.fieldComponentDefToEnglish.bind(this);
    this.formatField = this.formatField.bind(this);
    this.formatForm = this.formatForm.bind(this);
    this.formatExpression = this.formatExpression.bind(this);
    this.formatPropAssignment = this.formatPropAssignment.bind(this);
    this.formatFieldComponentDef = this.formatFieldComponentDef.bind(this);
    this.randomFormId = this.randomFormId.bind(this);
    this.randomFieldId = this.randomFieldId.bind(this);
    this.randomId = this.randomId.bind(this);
    this.randomFormComponent = this.randomFormComponent.bind(this);
    this.randomFieldComponent = this.randomFieldComponent.bind(this);
    this.randomComponent = this.randomComponent.bind(this);
    this.randomValueExpression = this.randomValueExpression.bind(this);
    this.randomJsExpression = this.randomJsExpression.bind(this);
    this.wrapInJsIife = this.wrapInJsIife.bind(this);
    this.parameterizedRandomJsExpression =
      this.parameterizedRandomJsExpression.bind(this);
    this.wrapInQuotes = this.wrapInQuotes.bind(this);
    this.randomFieldState = this.randomFieldState.bind(this);
    this.indentLines = this.indentLines.bind(this);
    this.escapeString = this.escapeString.bind(this);
  }

  public clear() {
    this.ids.clear();
  }

  public generateForm() {
    const initialDepth = 0;
    const root = this.randomForm(initialDepth);
    traverseDFS(root, this.getChildren);

    return root;
  }

  public toFormLang(form: IForm): string {
    const root = {
      node: form,
      state: {
        code: "",
      },
    };
    traverseDFS<FormLangNodeState>(
      root,
      (nodeState) => {
        if (!nodeState.children) {
          nodeState.children = this.getChildren(nodeState.node).map(
            (childNode) => ({
              node: childNode,
              state: {
                code: "",
              },
            }),
          );
        }
        return nodeState.children;
      },
      () => {},
      (nodeState) => {
        if (nodeState.node.$type === "Form") {
          nodeState.state.code = this.formatForm(
            nodeState.node,
            nodeState.children!.map((child) => child.state.code),
          );
        } else if (nodeState.node.$type === "Field") {
          nodeState.state.code = this.formatField(nodeState.node);
        }
      },
    );

    return root.state.code;
  }

  public removeRandomNode(form: IForm) {
    const root = { node: form, state: { parent: null } };
    let isRemoved = false;
    let removedNode: IFormChild;
    let removedNodeContext: RemovedNodeContext;
    while (!isRemoved) {
      traverseDFS<RemoveNodeAlgorithmNodeState>(
        root,
        (nodeState) => {
          if (!nodeState.children) {
            nodeState.children = this.getChildren(nodeState.node).map(
              (childNode) => ({
                node: childNode,
                state: {
                  parent: nodeState,
                },
              }),
            );
          }
          return nodeState.children;
        },
        () => {},
        (nodeState) => {
          if (isRemoved) {
            return;
          }
          const removalProbability =
            1 - Math.pow(this.params.zeta!, nodeState.node.depth);
          const shouldRemove = this.faker.datatype.boolean({
            probability: removalProbability,
          });
          if (shouldRemove) {
            isRemoved = true;
            removedNode = nodeState.node;
            const removedNodeParent = nodeState.state.parent?.node ?? null;
            // Should always be true if there is a parent - mainly for TS sanity
            const isParentForm = removedNodeParent?.$type === "Form";
            const removedNodeChildIndex = isParentForm
              ? removedNodeParent.children!.indexOf(nodeState.node)
              : -1;
            let removedNodeBeforeNode: IFormChild | null = null;
            let removedNodeAfterNode: IFormChild | null = null;
            if (isParentForm) {
              removedNodeBeforeNode =
                removedNodeChildIndex > 0
                  ? removedNodeParent.children![removedNodeChildIndex - 1]
                  : null;
              removedNodeAfterNode =
                removedNodeChildIndex < removedNodeParent.children!.length - 1
                  ? removedNodeParent.children![removedNodeChildIndex + 1]
                  : null;

              removedNodeParent.children = removedNodeParent.children!.filter(
                (child) => child !== nodeState.node,
              );
            }
            removedNodeContext = {
              parent: removedNodeParent,
              before: removedNodeBeforeNode,
              after: removedNodeAfterNode,
            };
          }
        },
      );
    }

    // @ts-ignore
    return { removedNode, removedNodeContext };
  }

  public toEnglish(formOrField: IFormChild): string {
    if (formOrField.$type === "Form") {
      return this.formToEnglish(formOrField);
    } else {
      return this.fieldToEnglish(formOrField);
    }
  }

  public removedNodeContextToEnglishStatements(
    removedNodeContext: RemovedNodeContext,
  ): string[] {
    let siblingsStatement = "";
    const parentStatement = removedNodeContext.parent
      ? `is a child of the ${this.idToEnglish(removedNodeContext.parent)}.`
      : "";
    const isAfter = Boolean(removedNodeContext.before);
    const isBefore = Boolean(removedNodeContext.after);
    const isBetween = isBefore && isAfter;
    if (isBetween) {
      siblingsStatement = `is located between the ${this.idToEnglish(removedNodeContext.before!)} and the ${this.idToEnglish(removedNodeContext.after!)}`;
    } else if (isAfter) {
      siblingsStatement = `is located after the ${this.idToEnglish(removedNodeContext.before!)}`;
    } else if (isBefore) {
      siblingsStatement = `is located before the ${this.idToEnglish(removedNodeContext.after!)}`;
    }

    return [parentStatement, siblingsStatement];
  }

  private idToEnglish(formOrField: IFormChild): string {
    // TODO - Randomly choose "id" or "ID" or "name"
    if (formOrField.$type === "Form") {
      return `form whose id is '${formOrField.name}'`;
    } else {
      return `field whose id is '${formOrField.name}'`;
    }
  }

  private fieldToEnglish(field: IField): string {
    let stateDefStatement = "";
    if (field.state) {
      const state = field.state;
      const defaultValue = state.defaultValue;
      const stateTypeStatement = ` with state of type: '${state.type}${state.isArray ? "[]" : ""}'`;
      const stateDefaultValueStatement = defaultValue
        ? ` and its default value is: ${defaultValue.expr}${defaultValue.isAsExpression ? " (and is passed as an expression)" : ""}`
        : "";
      stateDefStatement = `${stateTypeStatement}${stateDefaultValueStatement},`;
    }
    const componentStatement = this.fieldComponentDefToEnglish(field.component);

    return this.indentLines(
      `a ${this.idToEnglish(field)}${stateDefStatement} ${stateDefStatement ? "and is " : ""}using the ${componentStatement}.\n`,
      field.depth,
    );
  }

  private formToEnglish(form: IForm): string {
    const componentStatement = this.fieldComponentDefToEnglish(form.component);
    const fieldsStatements = form.children!.map(this.toEnglish).join("\n");

    const formStatement = this.indentLines(
      `a ${this.idToEnglish(form)} using the ${componentStatement},${fieldsStatements ? "whose children are:" : "with no children."}\n`,
      form.depth,
    );

    return `${formStatement}${fieldsStatements}`;
  }

  private fieldComponentDefToEnglish(component: IFieldComponent): string {
    const propAssignmentsCode = Object.entries(component.propAssignments)
      .map(([propName, propValue]) =>
        this.formatPropAssignment(propName, propValue),
      )
      .join(" "); // TODO - Randomly choose the separator

    return `component '${component.component.name}'${propAssignmentsCode ? ` to which the following prop assignments are made: ${propAssignmentsCode}` : ""}`;
  }

  private randomForm(depth: number): IForm {
    return {
      $type: "Form",
      name: this.randomFormId(),
      component: this.randomFormComponent(),
      children: null,
      depth,
    };
  }

  private randomField(depth: number): IField {
    return {
      $type: "Field",
      name: this.randomFieldId(),
      component: this.randomFieldComponent(),
      state: this.randomFieldState(),
      depth,
    };
  }

  private getChildren(node: IFormChild) {
    const isForm = node.$type === "Form";
    if (isForm) {
      if (!node.children) {
        node.children = this.randomChildren(node);
      }
      return node.children;
    } else {
      return [];
    }
  }

  private randomChildren(form: IForm): Array<IFormChild> {
    const isAtRoot = form.depth === 0;
    const numChildren = this.faker.number.int({
      min: isAtRoot ? 1 : this.params.minChildren!,
      max: this.params.maxChildren!,
    });
    const children: Array<IFormChild> = Array(numChildren);
    const depth = form.depth + 1;
    const isMaxDepthReached = this.params.D && this.params.D === depth;
    const formProbability = isMaxDepthReached
      ? 0
      : Math.pow(this.params.alpha, depth);

    for (let i = 0; i < numChildren; i++) {
      const isForm = this.faker.datatype.boolean({
        probability: formProbability,
      });
      children[i] = isForm ? this.randomForm(depth) : this.randomField(depth);
    }

    return children;
  }

  private formatField(field: IField): string {
    let stateDefCode = "";
    if (field.state) {
      const state = field.state;
      const defaultValue = state.defaultValue;
      const stateTypeCode = `${state.type}${state.isArray ? "[]" : ""}`;
      const stateDefaultValueCode = defaultValue
        ? ` default ${this.formatExpression(defaultValue)}`
        : "";
      stateDefCode = `state ${stateTypeCode}${stateDefaultValueCode}\n`;
    }
    const componentCode = this.formatFieldComponentDef(field.component);
    const openingFieldCode = this.indentLines(
      `field ${field.name} {`,
      field.depth,
    );
    const fieldBody = this.indentLines(
      `${stateDefCode}${componentCode}`,
      field.depth + 1,
    );
    const closingBrace = this.indentLines("}", field.depth);

    return `${openingFieldCode}\n${fieldBody}\n${closingBrace}`;
  }

  private formatForm(form: IForm, fieldsCodes: Array<string>): string {
    const openingFormCode = this.indentLines(`form ${form.name} {`, form.depth);
    const formComponentDef = this.indentLines(
      this.formatFieldComponentDef(form.component),
      form.depth + 1,
    );
    const fieldsCode = fieldsCodes.join("\n");
    const closingBrace = this.indentLines("}", form.depth);
    return `${openingFormCode}\n${formComponentDef}\n${fieldsCode}\n${closingBrace}\n`;
  }

  private formatExpression(expression: RandomValueExpression) {
    const formattedExprString = this.escapeString(expression.expr);

    return `"${formattedExprString}"${expression.isAsExpression ? " as expression" : ""}`;
  }

  private formatPropAssignment(
    propName: string,
    propValue: RandomValueExpression,
  ): string {
    return `${propName}=${this.formatExpression(propValue)}`;
  }

  private formatFieldComponentDef(component: IFieldComponent): string {
    const propAssignmentsCode = Object.entries(component.propAssignments)
      .map(([propName, propValue]) =>
        this.formatPropAssignment(propName, propValue),
      )
      .join(" ");

    return `comp ${component.component.name} ${propAssignmentsCode}\n`;
  }

  private randomFormId(): string {
    return this.randomId(
      this.params.formIdMinLength!,
      this.params.formIdMaxLength!,
    );
  }

  private randomFieldId(): string {
    return this.randomId(
      this.params.fieldIdMinLength!,
      this.params.fieldIdMaxLength!,
    );
  }

  private randomId(min: number, max: number): string {
    let id = undefined;
    while (id === undefined || this.ids.has(id)) {
      id = this.faker.helpers.fromRegExp(/[_a-zA-Z][\w_]*/).slice(0, 50);
    }
    this.ids.add(id);

    return id;
  }

  private randomFieldComponent(): IFieldComponent {
    return this.randomComponent(this.availableFieldComponentIds);
  }

  private randomFormComponent(): IFieldComponent {
    return this.randomComponent(this.availableFormComponentIds);
  }

  private randomComponent(components: Array<Component>): IFieldComponent {
    const component = this.faker.helpers.arrayElement(components);
    const propAssignments: Record<string, RandomValueExpression> = {};
    const propKeys = this.faker.helpers.arrayElements(component.props, {
      min: 0,
      max: component.props.length,
    });
    for (const propKey of propKeys) {
      propAssignments[propKey.key] = this.randomValueExpression();
    }

    return {
      component,
      propAssignments,
    };
  }

  private randomValueExpression(): RandomValueExpression {
    const isAsExpression = this.faker.datatype.boolean({
      probability: this.params.epsilon,
    });

    return {
      expr: isAsExpression
        ? this.randomJsExpression() // TODO Support more languages
        : this.faker.internet.color(), // TODO - Randomize the categories and properties of values
      isAsExpression,
    };
  }

  private randomJsExpression() {
    // TODO - support more types of expressions
    const fromPreGeneratedList = this.faker.datatype.boolean();

    return fromPreGeneratedList
      ? this.faker.helpers.arrayElement(RANDOM_JS_EXPRESSIONS)
      : this.wrapInJsIife(this.faker.number.float(100).toString());
  }

  private wrapInJsIife(expr: string): string {
    return `(() => ${expr})()`;
  }

  private parameterizedRandomJsExpression(
    type: BuiltInType,
    isArray: boolean,
    isAsExpression: boolean,
    arrayElementCount: number = 0,
  ): RandomValueExpression {
    // Arrays must be passed as expressions
    isAsExpression = isAsExpression || isArray;
    let expr: string;
    const isString = type === "string";
    // TODO - Randomize the categories and properties of values
    const valueGenerator = isString
      ? this.faker.person.fullName
      : type === "number"
        ? this.faker.number.float
        : this.faker.datatype.boolean;
    if (isArray) {
      expr = JSON.stringify(
        this.faker.helpers.multiple(() => valueGenerator(), {
          count: arrayElementCount,
        }),
      );
      const shouldWrapInIife = this.faker.datatype.boolean();
      expr = shouldWrapInIife ? this.wrapInJsIife(expr) : expr;
    } else {
      // Add quotes around string expressions
      const shouldWrapInQuotes = isString && isAsExpression;
      const quoteType = this.faker.datatype.boolean() ? '"' : "'";
      const value = valueGenerator();
      expr = `${shouldWrapInQuotes ? this.wrapInQuotes(value as string, quoteType) : value}`;
    }

    return {
      expr,
      isAsExpression,
    };
  }

  private wrapInQuotes(str: string, quoteType: string): string {
    return `${quoteType}${str}${quoteType}`;
  }

  private randomFieldState(): IFieldState | null {
    const isStateManaged = this.faker.datatype.boolean({
      probability: this.params.beta,
    });
    if (isStateManaged) {
      const isArray = this.faker.datatype.boolean({
        probability: this.params.gamma,
      });
      const arrayElementCount = isArray
        ? this.faker.number.int({
            min: this.params.amin,
            max: this.params.amax,
          })
        : 0;
      const dataType = this.faker.helpers.arrayElement(
        ProbabilisticSearchFormGenerator.BUILTIN_STATE_TYPES,
      );
      const containsDefaultValue = this.faker.datatype.boolean({
        probability: this.params.delta,
      });
      const mustBeExpression = dataType !== "string" || isArray;
      const isAsExpressionProbability = mustBeExpression
        ? 1
        : this.params.epsilon;
      const isAsExpression = this.faker.datatype.boolean({
        probability: isAsExpressionProbability,
      });
      const defaultValue = containsDefaultValue
        ? this.parameterizedRandomJsExpression(
            dataType,
            isArray,
            isAsExpression,
            arrayElementCount,
          )
        : null;

      return {
        type: dataType,
        isArray,
        defaultValue,
      };
    } else {
      return null;
    }
  }

  private indentLines(
    code: string,
    level: number,
    indentSequence = "\t",
  ): string {
    const indentation = indentSequence.repeat(level);

    return code
      .replace(/(\r\n|\r|\n)/g, "\n")
      .split("\n")
      .map((line) => `${indentation}${line}`)
      .join("\n");
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n");
  }
}
