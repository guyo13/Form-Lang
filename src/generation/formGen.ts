import { z } from "zod";
import type { Faker } from "@faker-js/faker";
import type { BuiltInType, ComponentDef } from "../language/generated/ast.js";
import { traverseDFS } from "../util/traversal.js";
import { RANDOM_JS_EXPRESSIONS } from "./data.js";

const probabilitySchema = z.number().min(0).lt(1);
const integerSchema = z.number().min(0).int();

const probabilisticSearchParamsSchema = z.object({
  alpha: probabilitySchema,
  beta: probabilitySchema,
  gamma: probabilitySchema.optional().default(0),
  delta: probabilitySchema.optional().default(0),
  epsilon: probabilitySchema.optional().default(0),
  D: integerSchema.optional(),
  minChildren: integerSchema.optional().default(0),
  maChildren: integerSchema.min(1).default(2),
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

interface RandomValueExpression {
  expr: string;
  isAsExpression: boolean;
}

interface IFieldComponent {
  component: Component;
  propAssignments: Record<string, RandomValueExpression>;
}

interface IForm {
  readonly $type: "Form";
  name: string;
  component: IFieldComponent;
  children: Array<IFormChild> | null;
  depth: number;
}

interface IFieldState {
  type: BuiltInType;
  isArray: boolean;
  defaultValue: RandomValueExpression | null;
}

interface IField {
  readonly $type: "Field";
  name: string;
  component: IFieldComponent;
  state: IFieldState | null;
  depth: number;
}

type IFormChild = IForm | IField;

export default class ProbabilisticSearchFormGenerator {
  readonly params: ProbabilisticSearchParams;
  readonly faker: Faker;
  readonly ids: Set<string>;
  readonly availableFormComponentIds: Array<Component>;
  readonly availableFieldComponentIds: Array<Component>;

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
    this.generateForm = this.generateForm.bind(this);
    this.randomForm = this.randomForm.bind(this);
    this.randomField = this.randomField.bind(this);
    this.getChildren = this.getChildren.bind(this);
    this.randomChildren = this.randomChildren.bind(this);
    this.onEntry = this.onEntry.bind(this);
    this.onExit = this.onExit.bind(this);
    this.toFormLang = this.toFormLang.bind(this);
    this.randomFormId = this.randomFormId.bind(this);
    this.randomFieldId = this.randomFieldId.bind(this);
    this.randomId = this.randomId.bind(this);
    this.randomFormComponent = this.randomFormComponent.bind(this);
    this.randomFieldComponent = this.randomFieldComponent.bind(this);
    this.randomComponent = this.randomComponent.bind(this);
    this.randomValueExpression = this.randomValueExpression.bind(this);
    this.randomJsExpression = this.randomJsExpression.bind(this);
    this.randomFieldState = this.randomFieldState.bind(this);
  }

  public generateForm() {
    const initialDepth = 0;
    const root = this.randomForm(initialDepth);
    traverseDFS(root, this.getChildren, this.onEntry, this.onExit);

    return this.toFormLang(root);
  }

  private randomForm(depth: number): IForm {
    return {
      $type: "Form",
      name: this.randomFormId(),
      component: this.randomFormComponent(),
      children: [],
      depth,
    };
  }

  private randomField(depth: number): IField {
    return {
      $type: "Field",
      name: this.randomFieldId(),
      component: this.randomFormComponent(),
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
    const numChildren = this.faker.number.int({
      min: this.params.minChildren!,
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

  // TODO -implement
  private onEntry(node: IFormChild) {}
  // TODO -implement
  private onExit(node: IFormChild) {}
  // TODO -implement
  private toFormLang(form: IForm): string {
    return "";
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
      id = this.faker.string.alphanumeric(
        this.faker.number.int({
          min,
          max,
        }),
      );
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
      : `(() => ${this.faker.number.float(100)})()`;
  }

  private randomFieldState(): IFieldState | null {
    // TODO Implement
    return null;
  }
}
