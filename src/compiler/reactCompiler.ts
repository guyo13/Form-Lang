import type {
  BuiltInType,
  ComponentPropKey,
  Field,
  FieldComponentDef,
  Form,
  Model,
  ValueExpression,
} from "../language/generated/ast.js";
import type { ICompilerConfig, IComponentConfig } from "./compilerConfig.js";
import { isField, isForm, isModel } from "../language/generated/ast.js";
import { capitalize, uncapitalize, zip } from "./compilerUtil.js";
import { traverseDFS } from "../util/traversal.js";

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
  callSiteCode: string | null;
  componentCode: string | null;
  stateDescription: NodeStateDescription | null;
  componentConfig: IComponentConfig | null;
  root: Form;
}

interface GeneratedFormOutput {
  status: "success";
  formComponentCode: string;
  formSliceCreatorCode: string | null;
}

interface CompiledFormOutput extends GeneratedFormOutput {
  formStateCreator?: string;
}

interface CompilationErrorResult {
  status: "error";
  errors: string[];
}

type GenerateFormOutput = GeneratedFormOutput | CompilationErrorResult;

type ModelCompilationSuccessResult = {
  status: "success";
  output: Record<string, CompiledFormOutput>;
};

type CompileModelOutput =
  | ModelCompilationSuccessResult
  | CompilationErrorResult;

type FormFieldNodeState = NodeState<Form | Field, NodeTraversalState>;

export class ReactCompiler {
  readonly config: ICompilerConfig;
  componentConfigsInForm: Record<string, Map<string, IComponentConfig>>;
  formStateManagement: Map<string, Form>;

  constructor(config: ICompilerConfig) {
    this.config = config;
    this.componentConfigsInForm = {};
    this.formStateManagement = new Map();
    this.compileModel = this.compileModel.bind(this);
    this.generateForm = this.generateForm.bind(this);
    this.generateFormsStateCreatorWithImmerMiddleware =
      this.generateFormsStateCreatorWithImmerMiddleware.bind(this);
    this.getFormsStateCreatorName = this.getFormsStateCreatorName.bind(this);
    this.getFormSliceCreatorName = this.getFormSliceCreatorName.bind(this);
    this.getFormSliceId = this.getFormSliceId.bind(this);
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
    this.generateFieldStatefulComponentCode =
      this.generateFieldStatefulComponentCode.bind(this);
    this.generateFieldCode = this.generateFieldCode.bind(this);
    this.getComponentAlias = this.getComponentAlias.bind(this);
    this.generateJsxOpenTag = this.generateJsxOpenTag.bind(this);
    this.generateJsxCloseTag = this.generateJsxCloseTag.bind(this);
    this.generateStatePropsAssignment =
      this.generateStatePropsAssignment.bind(this);
    this.getStateSetterId = this.getStateSetterId.bind(this);
    this.getDataFormFieldId = this.getDataFormFieldId.bind(this);
    this.resolveComponentConfig = this.resolveComponentConfig.bind(this);
  }

  public compileModel(model: Model): CompileModelOutput {
    const compilationResults: ModelCompilationSuccessResult["output"] = {};
    const formOutputs = new Map<string, GenerateFormOutput>();
    let hasErrors = false;
    for (const form of model.forms) {
      const out = this.generateForm(form);
      formOutputs.set(form.name, out);
    }
    const { formOutputsForStateManagement, formOutputsWithoutStateManagement } =
      [...formOutputs.entries()].reduce(
        (res, item) => {
          const formName = item[0];
          if (this.formStateManagement.has(formName)) {
            res.formOutputsForStateManagement.push(item);
          } else {
            res.formOutputsWithoutStateManagement.push(item);
          }
          return res;
        },
        {
          formOutputsForStateManagement: [] as Array<
            [string, GenerateFormOutput]
          >,
          formOutputsWithoutStateManagement: [] as Array<
            [string, GenerateFormOutput]
          >,
        },
      );
    for (const [formName, formOutput] of formOutputsWithoutStateManagement) {
      if (formOutput.status === "success") {
        compilationResults[formName] = {
          ...formOutput,
        };
      } else {
        hasErrors = true;
      }
    }
    if (formOutputsForStateManagement.length > 0) {
      if (this.config.stateManagementConfig?.singleStateStore) {
        return {
          status: "error",
          errors: [
            ...[...formOutputs.values()].flatMap((formOutput) =>
              formOutput.status === "error" ? formOutput.errors : [],
            ),
            "singleStateStore not yet implemented",
          ],
        };
      } else {
        for (const [formName, formOutput] of formOutputsForStateManagement) {
          if (formOutput.status === "error") {
            formOutput.errors.push(
              `Error: Failed to create state creator for form '${formName}'`,
            );
            hasErrors = true;
          } else {
            const storeName = formName;
            const formStateCreator =
              this.generateFormsStateCreatorWithImmerMiddleware(
                [this.formStateManagement.get(formName)!],
                storeName,
              );
            compilationResults[formName] = {
              ...formOutput,
              formStateCreator,
            };
          }
        }
      }
    }

    return hasErrors
      ? {
          status: "error",
          errors: [...formOutputs.values()].flatMap((out) =>
            out.status === "error" ? out.errors : [],
          ),
        }
      : { status: "success", output: compilationResults };
  }

  private generateForm(form: Form): GenerateFormOutput {
    this.componentConfigsInForm[form.name] = new Map();
    const root = {
      node: form,
      state: {
        componentConfig: null,
        callSiteCode: null,
        componentCode: null,
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
    if (!root.state?.callSiteCode) {
      return {
        errors: [`Failed generating code for form '${form.name}'`],
        status: "error",
      };
    }
    const formComponentCode = this.generateFunctionalComponent(
      root.node.name,
      root.state!.callSiteCode,
    );
    const formSliceCreatorCode = this.generateFormStateSliceCreator(root);

    return {
      status: "success",
      formComponentCode,
      formSliceCreatorCode,
    };
  }

  private findImportAliasClashes(configs: Map<string, IComponentConfig>) {
    const clashes = [];
    const visitedAliases = new Map<string, [IComponentConfig, string]>();
    for (const [componentName, config] of configs.entries()) {
      const alias = this.getComponentAlias(config);
      if (visitedAliases.has(alias)) {
        const [existingConfig, existingComponent] = visitedAliases.get(alias)!;
        if (componentName !== existingComponent) {
          clashes.push(
            `Error: import alias '${alias}' from component '${componentName}' with config: ${JSON.stringify(config)}, clashes with existing alias from component '${existingComponent}' with config ${JSON.stringify(existingConfig)}`,
          );
        }
      } else {
        visitedAliases.set(alias, [config, componentName]);
      }
    }
    return clashes;
  }

  /**
   * Generates:
   * const use<Capitalized storeName>Store = create(
   *  immer(
   *    (set) => ({
   *        // for each <sliceId>
   *            <sliceId>: <sliceCreatorName>(set)
   *    })
   * ));
   * */
  private generateFormsStateCreatorWithImmerMiddleware(
    forms: Array<Form>,
    storeName: string,
  ) {
    const storeVariableName = this.getFormsStateCreatorName(storeName);
    let slicesCode = "";
    for (const form of forms) {
      slicesCode += `\n${this.getFormSliceId(form)}: ${this.getFormSliceCreatorName(form)}(set),`;
    }
    const storeCreatorCode = `const ${storeVariableName} = create(immer((set) => ({${slicesCode})));`;

    return storeCreatorCode;
  }

  private getFormsStateCreatorName(storeName: string): string {
    return `use${capitalize(storeName)}Store`;
  }

  private getFormSliceCreatorName(form: Form): string {
    return `create${capitalize(this.getFormSliceId(form))}`;
  }

  private getFormSliceId(form: Form): string {
    return `${form.name}Slice`;
  }

  /**
   * Generates:
   * function <sliceCreatorName>(set) {
   *     return {
   *         <stateId>: <stateDefaultValue>,
   *         <stateSetterId>: (newState) => set( (state) => ({ <stateId>: newState }) ),
   *     };
   * }
   * */
  private generateFormStateSliceCreator(
    root: NodeState<Form, NodeTraversalState>,
  ): string | null {
    const sliceCreatorName = this.getFormSliceCreatorName(root.node);
    const sliceState = { stateCode: "" };
    traverseDFS(
      root,
      this.getNodeChildren,
      (nodeState: FormFieldNodeState) => {
        if (nodeState.state.stateDescription !== null) {
          const stateId = nodeState.state.stateDescription.stateId;
          const defaultValue =
            nodeState.state.stateDescription.defaultValue?.value ?? "null";
          const stateSetterId = this.getStateSetterId(stateId);
          sliceState.stateCode += `${stateId}: ${defaultValue},\n`;
          sliceState.stateCode += `${stateSetterId}: (newState) => set( (state) => ({ ${stateId}: newState }) ),\n`;
        }
      },
      () => {},
    );
    const sliceCreatorBody = `(set) {return {${sliceState.stateCode}};}`;
    return sliceState.stateCode
      ? `function ${sliceCreatorName}${sliceCreatorBody}`
      : null;
  }

  private generateFunctionalComponent(
    componentName: string,
    componentReturnJsxExpression: string,
    componentRenderCode: string = "",
  ) {
    return `function ${componentName}() {\n${componentRenderCode}\nreturn (\n${componentReturnJsxExpression}\n);\n}`;
  }

  private getNodeChildren(nodeState: FormFieldNodeState) {
    if (!nodeState.children) {
      const node = nodeState.node;
      const children = isForm(node) ? node.children : [];
      nodeState.children = children.map((child) => ({
        node: child,
        state: {
          componentConfig: null,
          callSiteCode: null,
          componentCode: null,
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
    this.componentConfigsInForm[nodeState.state.root.name].set(
      nodeState.node.component.componentId.ref!.name,
      nodeState.state.componentConfig,
    );
    const isNodeStateManaged = isField(nodeState.node) && nodeState.node.state;
    if (isNodeStateManaged) {
      this.formStateManagement.set(
        nodeState.state.root.name,
        nodeState.state.root,
      );
    }
  }

  private handleNodeExit(nodeState: FormFieldNodeState) {
    const node = nodeState.node;
    if (isForm(node)) {
      nodeState.state!.stateDescription = this.generateFormStateDescription(
        node,
        nodeState.children,
        nodeState.state!,
      );
      nodeState.state!.callSiteCode = this.generateFormCode(
        node,
        nodeState.children,
        nodeState.state!,
      );
    } else if (isField(node)) {
      nodeState.state!.stateDescription = this.generateFieldStateDescription(
        node,
        nodeState.state!,
      );
      if (nodeState.state!.stateDescription !== null) {
        nodeState.state!.componentCode =
          this.generateFieldStatefulComponentCode(node, nodeState.state!);
      }
      nodeState.state!.callSiteCode = this.generateFieldCode(
        node,
        nodeState.state!,
      );
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
    const openTag = this.generateJsxOpenTag(form, state, false);
    const fieldsCode =
      children?.map((nodeState) => nodeState.state!.callSiteCode) ?? [];
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

  /**
   * Generates:
   * function Field_<capitalizedStateId>() {
   *     const <stateId> = <useStateHook>((state) => state.<sliceId>.<stateId>);
   *     const <stateSetterId> = <useStateHook>((state) => state.<sliceId>.<stateSetterId>);
   *
   *     return (<<ComponentName> <props> <state assignment>/>);
   * }
   * */
  private generateFieldStatefulComponentCode(
    field: Field,
    state: NodeTraversalState,
  ): string {
    // TODO - implement
    // const stateDescription = state.stateDescription!;
    // const stateId = stateDescription.stateId;
    // const stateSetterId = this.getStateSetterId(stateId);

    return "";
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
    isSelfClosingElement: boolean,
  ) {
    const componentConfig: IComponentConfig = state.componentConfig!;
    const componentAlias = this.getComponentAlias(componentConfig);
    const componentProps = zip(
      formOrField.component.componentPropsKeys,
      formOrField.component.componentPropsValues,
    ) as [ComponentPropKey, ValueExpression][];

    return `<${componentAlias}${componentProps
      .map(
        ([propKey, propVal]) =>
          `\n${propKey.key}={${propVal.isExpression ? propVal.value : `"${propVal.value}"`}}`,
      )
      .join(
        " ",
      )} dataFormFieldId="${this.getDataFormFieldId(formOrField)}"${this.generateStatePropsAssignment(state)}${
      isSelfClosingElement ? "/" : ""
    }>`;
  }

  private generateJsxCloseTag(componentConfig: IComponentConfig) {
    const componentAlias = this.getComponentAlias(componentConfig);
    return `</${componentAlias}>`;
  }

  private generateStatePropsAssignment(state: NodeTraversalState) {
    const containsStateDesc = Boolean(state.stateDescription);
    const stateId = state.stateDescription?.stateId;
    const componentConfig: IComponentConfig = state.componentConfig!;

    return containsStateDesc
      ? `${componentConfig.stateManagement!.valuePropName}={${stateId}}${componentConfig.stateManagement!.valueSetterPropName}={${this.getStateSetterId(stateId!)}}`
      : "";
  }

  private getStateSetterId(stateId: string): string {
    return `set${capitalize(stateId)}`;
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
