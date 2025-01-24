import { z } from "zod";
import type { Faker } from "@faker-js/faker";
import type { ComponentDef } from "../language/generated/ast.js";
import { traverseDFS } from "../util/traversal.js";

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
    this.randomForm = this.randomForm.bind(this);
    this.getChildren = this.getChildren.bind(this);
    this.onEntry = this.onEntry.bind(this);
    this.onExit = this.onExit.bind(this);
    this.toFormLang = this.toFormLang.bind(this);
    this.randomFormId = this.randomFormId.bind(this);
    this.randomFieldId = this.randomFieldId.bind(this);
    this.randomId = this.randomId.bind(this);
    this.randomFormComponent = this.randomFormComponent.bind(this);
    this.randomFieldComponent = this.randomFieldComponent.bind(this);
    this.randomComponent = this.randomComponent.bind(this);
  }

  public randomForm() {
    const root = {
      name: this.randomFormId(),
      component: this.randomFormComponent(),
      children: [],
      depth: 0,
    };
    traverseDFS(root, this.getChildren, this.onEntry, this.onExit);

    return this.toFormLang(root);
  }

  // TODO -implement
  private getChildren(node: any) {
    return node.children;
  }
  // TODO -implement
  private onEntry(node: any) {}
  // TODO -implement
  private onExit(node: any) {}
  // TODO -implement
  private toFormLang(node: any): string {
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

    return id;
  }

  private randomFieldComponent(): Component {
    return this.randomComponent(this.availableFieldComponentIds);
  }

  private randomFormComponent(): Component {
    return this.randomComponent(this.availableFormComponentIds);
  }

  private randomComponent(components: Array<Component>): Component {
    return this.faker.helpers.arrayElement(components);
  }
}
