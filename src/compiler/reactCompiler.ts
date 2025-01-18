import type {
  BuiltInType,
  ComponentDefPropKey,
  Field,
  FieldComponentDef,
  Form,
  Model,
  ValueExpression,
} from "../language/generated/ast.js";
import type { ICompilerConfig, IComponentConfig } from "./compilerConfig.js";
import { isField, isForm, isModel } from "../language/generated/ast.js";
import { capitalize, traverseDFS, uncapitalize, zip } from "./compilerUtil.js";

interface NodeState<N, S> {
  node: N;
  state: S;
  children?: Array<NodeState<N, S>>;
}

interface NodeStateDescription {
  type: BuiltInType;
  isArray: boolean;
  defaultValue: ValueExpression | undefined;
  stateId: string;
}

interface NodeTraversalState {
  code: string | null;
  stateDescription: NodeStateDescription | null;
  componentConfig: IComponentConfig | null;
  root: Form;
}

type GenerateFormOutput =
  | {
      status: "success";
      formComponentCode: string;
      formSliceCreatorCode: string;
    }
  | { status: "error"; errors: string[] };

type FormFieldNodeState = NodeState<Form | Field, NodeTraversalState>;

export class ReactCompiler {
  readonly config: ICompilerConfig;
  componentConfigsInForm: Record<string, Set<IComponentConfig>>;

  constructor(config: ICompilerConfig) {
    this.config = config;
    this.componentConfigsInForm = {};
    this.compileModel = this.compileModel.bind(this);
    this.generateForm = this.generateForm.bind(this);
    this.generateFormStateSliceCreator =
      this.generateFormStateSliceCreator.bind(this);
    this.generateFunctionalComponent =
      this.generateFunctionalComponent.bind(this);
    this.getNodeChildren = this.getNodeChildren.bind(this);
    this.handleNodeEntry = this.handleNodeEntry.bind(this);
    this.handleNodeExit = this.handleNodeExit.bind(this);
    this.generateFormStateDescription =
      this.generateFormStateDescription.bind(this);
    this.generateFormCode = this.generateFormCode.bind(this);
    this.generateFieldStateDescription =
      this.generateFieldStateDescription.bind(this);
    this.generateFieldCode = this.generateFieldCode.bind(this);
    this.getComponentAlias = this.getComponentAlias.bind(this);
    this.generateJsxOpenTag = this.generateJsxOpenTag.bind(this);
    this.generateJsxCloseTag = this.generateJsxCloseTag.bind(this);
    this.generateStatePropsAssignment =
      this.generateStatePropsAssignment.bind(this);
    this.getDataFormFieldId = this.getDataFormFieldId.bind(this);
    this.resolveComponentConfig = this.resolveComponentConfig.bind(this);
  }

  public compileModel(mode: Model) {}

  public generateForm(form: Form): GenerateFormOutput {
    this.componentConfigsInForm[form.name] = new Set();
    const root = {
      node: form,
      state: {
        componentConfig: null,
        code: null,
        stateDescription: null,
        root: form,
      },
    } satisfies FormFieldNodeState;
    traverseDFS(
      root,
      this.getNodeChildren,
      this.handleNodeEntry,
      this.handleNodeExit,
    );
    const importClashes = this.findImportAliasClashes(
      this.componentConfigsInForm[form.name],
    );
    if (importClashes.length > 0) {
      return { errors: importClashes, status: "error" };
    }
    if (!root.state?.code) {
      return {
        errors: [`Failed generating code for form '${form.name}'`],
        status: "error",
      };
    }
    const formComponentCode = this.generateFunctionalComponent(root);
    const formSliceCreatorCode = this.generateFormStateSliceCreator(root);

    return {
      status: "success",
      formComponentCode,
      formSliceCreatorCode,
    };
  }

  private findImportAliasClashes(configs: Set<IComponentConfig>) {
    const clashes = [];
    const visitedAliases = new Map<string, IComponentConfig>();
    for (const config of configs.values()) {
      const alias = this.getComponentAlias(config);
      if (visitedAliases.has(alias)) {
        const existingConfig = visitedAliases.get(alias);
        clashes.push(
          `Error: import alias '${alias}' from config: ${JSON.stringify(config)} clashes with existing alias from config ${JSON.stringify(existingConfig)}`,
        );
      } else {
        visitedAliases.set(alias, config);
      }
    }
    return clashes;
  }

  private generateFormStateSliceCreator(
    root: NodeState<Form, NodeTraversalState>,
  ): string {
    const sliceCreatorName = `create${capitalize(root.node.name)}Slice`;
    const sliceState = { stateCode: "" };
    traverseDFS(
      root,
      this.getNodeChildren,
      (nodeState: FormFieldNodeState) => {
        if (nodeState.state.stateDescription !== null) {
          const stateId = nodeState.state.stateDescription.stateId;
          const defaultValue =
            nodeState.state.stateDescription.defaultValue?.value ?? "null";
          const setStateId = `set${capitalize(stateId)}`;
          sliceState.stateCode += `${stateId}: ${defaultValue},\n`;
          sliceState.stateCode += `${setStateId}: (newState) => set( (state) => ({ ${stateId}: newState }) ),\n`;
        }
      },
      () => {},
    );
    const sliceCreatorBody = `(set) {return {${sliceState.stateCode}};}`;
    return `function ${sliceCreatorName}${sliceCreatorBody}`;
  }

  private generateFunctionalComponent(
    root: NodeState<Form, NodeTraversalState>,
  ) {
    return `function ${root.node.name}() {\nreturn (\n${root.state!.code}\n);\n}`;
  }

  private getNodeChildren(nodeState: FormFieldNodeState) {
    if (!nodeState.children) {
      const node = nodeState.node;
      const children = isForm(node) ? node.children : [];
      nodeState.children = children.map((child) => ({
        node: child,
        state: {
          componentConfig: null,
          code: null,
          stateDescription: null,
          root: nodeState.state.root,
        },
      }));
    }

    return nodeState.children;
  }

  private handleNodeEntry(nodeState: FormFieldNodeState) {
    nodeState.state.componentConfig = this.resolveComponentConfig(
      nodeState.node,
    );
    this.componentConfigsInForm[nodeState.state.root.name].add(
      nodeState.state.componentConfig,
    );
  }

  private handleNodeExit(nodeState: FormFieldNodeState) {
    const node = nodeState.node;
    if (isForm(node)) {
      nodeState.state!.stateDescription = this.generateFormStateDescription(
        node,
        nodeState.children,
        nodeState.state!,
      );
      nodeState.state!.code = this.generateFormCode(
        node,
        nodeState.children,
        nodeState.state!,
      );
    } else if (isField(node)) {
      nodeState.state!.stateDescription = this.generateFieldStateDescription(
        node,
        nodeState.state!,
      );
      nodeState.state!.code = this.generateFieldCode(node, nodeState.state!);
    }
  }

  private generateFormStateDescription(
    form: Form,
    children: FormFieldNodeState["children"],
    state: NodeTraversalState,
  ): NodeTraversalState["stateDescription"] {
    // TODO - Implement
    return null;
  }

  private generateFormCode(
    form: Form,
    children: FormFieldNodeState["children"],
    state: NodeTraversalState,
  ): string {
    const componentConfig: IComponentConfig = state.componentConfig!;
    const openTag = this.generateJsxOpenTag(form, state);
    const fieldsCode =
      children?.map((nodeState) => nodeState.state!.code) ?? [];
    const closeTag = this.generateJsxCloseTag(componentConfig);

    return `${openTag}\n${fieldsCode?.join("\n")}${closeTag}`;
  }

  private generateFieldStateDescription(
    field: Field,
    state: NodeTraversalState,
  ): NodeTraversalState["stateDescription"] {
    return field.state
      ? {
          type: field.state!.type,
          isArray: field.state!.isArray,
          defaultValue: field.state!.defaultValue,
          stateId: uncapitalize(
            this.getDataFormFieldId(field, "", (node: Form | Field) =>
              capitalize(node.name),
            ),
          ),
        }
      : null;
  }

  private generateFieldCode(field: Field, state: NodeTraversalState): string {
    return this.generateJsxOpenTag(field, state, true);
  }

  private getComponentAlias(componentConfig: IComponentConfig) {
    return (
      componentConfig.importSymbolAlias ?? componentConfig.importSymbolName
    );
  }

  private generateJsxOpenTag(
    formOrField: Form | Field,
    state: NodeTraversalState,
    closed = false,
  ) {
    const componentConfig: IComponentConfig = state.componentConfig!;
    const componentAlias = this.getComponentAlias(componentConfig);
    const componentProps = zip(
      formOrField.component.componentPropsKeys,
      formOrField.component.componentPropsValues,
    ) as [ComponentDefPropKey, ValueExpression][];

    return `<${componentAlias}${componentProps
      .map(
        ([key, val]) =>
          `\n${key.key}={${val.isExpression ? val.value : `"${val.value}"`}}`,
      )
      .join(
        " ",
      )} dataFormFieldId="${this.getDataFormFieldId(formOrField)}"${this.generateStatePropsAssignment(state)}${
      closed ? "/" : ""
    }>`;
  }

  private generateJsxCloseTag(componentConfig: IComponentConfig) {
    const componentAlias = this.getComponentAlias(componentConfig);
    return `</${componentAlias}>`;
  }

  private generateStatePropsAssignment(state: NodeTraversalState) {
    const containsStateDesc = Boolean(state.stateDescription);
    const componentConfig: IComponentConfig = state.componentConfig!;

    return containsStateDesc
      ? `${componentConfig.stateManagement!.valuePropName}={${state.stateDescription!.stateId}}${componentConfig.stateManagement!.valueSetterPropName}={set${capitalize(state.stateDescription!.stateId)}}`
      : "";
  }

  private getDataFormFieldId(
    formOrField: Form | Field,
    separator = "-",
    transform = (node: Form | Field): string => node.name,
  ) {
    const path = [];
    const frontier = [formOrField];
    while (frontier.length) {
      const node = frontier.pop() as Form | Field;
      path.push(transform(node));
      if (!isModel(node.$container)) {
        frontier.push(node.$container);
      }
    }
    return path.reverse().join(separator);
  }

  private resolveComponentConfig(formOrField: Form | Field): IComponentConfig {
    const component: FieldComponentDef = formOrField.component;
    const componentId = component.componentId.ref?.name;
    if (!componentId) {
      throw `Unresolved componentId reference '${component.componentId.$refText}'`;
    }
    const componentConfig = this.config.components[componentId];
    if (!componentConfig) {
      throw `Component ${componentId} not configured.`;
    }
    // Validate that required stateManagement config exists if the field declares state
    if (
      isField(formOrField) &&
      formOrField.state &&
      !componentConfig.stateManagement
    ) {
      throw `Field '${formOrField.name}' declares state but Component config for component '${componentId}' lacks a 'stateManagment' configuration.`;
    }

    return componentConfig;
  }
}
