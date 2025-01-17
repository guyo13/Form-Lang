import {
  ComponentDefPropKey,
  Field,
  FieldComponentDef,
  ValueExpression,
  Form,
  isField,
  isForm,
  isModel,
} from "../language/generated/ast.js";
import { ICompilerConfig, IComponentConfig } from "./compilerConfig.js";

interface NodeState<N, S> {
  node: N;
  state: S;
  children?: Array<NodeState<N, S>>;
}

interface NodeTraversalState {
  code: string | null;
  componentConfig: IComponentConfig | null;
}

type FormFieldNodeState = NodeState<Form | Field, NodeTraversalState>;

export class ReactCompiler {
  readonly config: ICompilerConfig;

  constructor(config: ICompilerConfig) {
    this.config = config;
    this.generateForm = this.generateForm.bind(this);
    this.generateFunctionalComponent =
      this.generateFunctionalComponent.bind(this);
    this.getNodeChildren = this.getNodeChildren.bind(this);
    this.handleNodeEntry = this.handleNodeEntry.bind(this);
    this.handleNodeExit = this.handleNodeExit.bind(this);
    this.generateFormCode = this.generateFormCode.bind(this);
    this.generateFieldCode = this.generateFieldCode.bind(this);
    this.getComponentAlias = this.getComponentAlias.bind(this);
    this.generateJsxOpenTag = this.generateJsxOpenTag.bind(this);
    this.generateJsxCloseTag = this.generateJsxCloseTag.bind(this);
    this.getDataFormFieldId = this.getDataFormFieldId.bind(this);
    this.resolveComponentConfig = this.resolveComponentConfig.bind(this);
  }

  public generateForm(form: Form): string {
    // TODO - Validate import aliases clashes
    const root = { node: form, state: { componentConfig: null, code: null } };
    traverseDFS(
      root,
      this.getNodeChildren,
      this.handleNodeEntry,
      this.handleNodeExit
    );
    if (!root.state?.code) {
      throw `Failed generating code for form '${form.name}'`;
    }
    return this.generateFunctionalComponent(root);
  }

  private generateFunctionalComponent(
    root: NodeState<Form, NodeTraversalState>
  ) {
    return `function ${root.node.name}() {\nreturn (\n${root.state!.code}\n);\n}`;
  }

  private getNodeChildren(nodeState: FormFieldNodeState) {
    if (!nodeState.children) {
      const node = nodeState.node;
      const children = isForm(node) ? node.children : [];
      nodeState.children = children.map((child) => ({
        node: child,
        state: { componentConfig: null, code: null },
      }));
    }

    return nodeState.children;
  }

  private handleNodeEntry(nodeState: FormFieldNodeState) {
    nodeState.state.componentConfig = this.resolveComponentConfig(
      nodeState.node.component
    );
  }

  private handleNodeExit(nodeState: FormFieldNodeState) {
    const node = nodeState.node;
    if (isForm(node)) {
      nodeState.state!.code = this.generateFormCode(
        node,
        nodeState.children,
        nodeState.state!.componentConfig!
      );
    } else if (isField(node)) {
      nodeState.state!.code = this.generateFieldCode(
        node,
        nodeState.state!.componentConfig!
      );
    }
  }

  private generateFormCode(
    form: Form,
    children: FormFieldNodeState["children"],
    componentConfig: IComponentConfig
  ): string {
    const openTag = this.generateJsxOpenTag(form, componentConfig);
    const fieldsCode =
      children?.map((nodeState) => nodeState.state!.code) ?? [];
    const closeTag = this.generateJsxCloseTag(componentConfig);
    return `${openTag}\n${fieldsCode?.join("\n")}${closeTag}`;
  }

  private generateFieldCode(
    field: Field,
    componentConfig: IComponentConfig
  ): string {
    return this.generateJsxOpenTag(field, componentConfig, true);
  }

  private getComponentAlias(componentConfig: IComponentConfig) {
    return (
      componentConfig.importSymbolAlias ?? componentConfig.importSymbolName
    );
  }

  private generateJsxOpenTag(
    formOrField: Form | Field,
    componentConfig: IComponentConfig,
    closed = false
  ) {
    const componentAlias = this.getComponentAlias(componentConfig);
    const componentProps = zip(
      formOrField.component.componentPropsKeys,
      formOrField.component.componentPropsValues
    ) as [ComponentDefPropKey, ValueExpression][];
    return `<${componentAlias}${componentProps
      .map(
        ([key, val]) =>
          `\n${key.key}={${val.isExpression ? val.value : `"${val.value}"`}}`
      )
      .join(" ")} dataFormFieldId="${this.getDataFormFieldId(formOrField)}"${
      closed ? "/" : ""
    }>`;
  }

  private generateJsxCloseTag(componentConfig: IComponentConfig) {
    const componentAlias = this.getComponentAlias(componentConfig);
    return `</${componentAlias}>`;
  }

  private getDataFormFieldId(formOrField: Form | Field) {
    const path = [];
    const frontier = [formOrField];
    while (frontier.length) {
      const node = frontier.pop() as Form | Field;
      path.push(node?.name);
      if (!isModel(node.$container)) {
        frontier.push(node.$container);
      }
    }
    return path.reverse().join("-");
  }

  private resolveComponentConfig(
    component: FieldComponentDef
  ): IComponentConfig {
    const componentId = component.componentId.ref?.name;
    if (!componentId) {
      throw `Unresolved componentId reference '${component.componentId.$refText}'`;
    }
    const componentConfig = this.config.components[componentId];
    if (!componentConfig) {
      throw `Component ${componentId} not configured.`;
    }

    return componentConfig;
  }
}

function traverseDFS<T>(
  rootNode: T,
  getChildren: (node: T) => T[],
  onEntry: (node: T, time: number) => void,
  onExit: (node: T, time: number) => void
): void {
  const visited = new Set<T>();
  let time = 0;

  const stack: T[] = [rootNode];

  while (stack.length > 0) {
    const node = stack[stack.length - 1];

    if (!visited.has(node)) {
      visited.add(node);
      time++;
      onEntry(node, time);

      // Get children of the node
      const children = getChildren(node);

      // Push unvisited children onto the stack in reverse order
      for (let child of children) {
        if (!visited.has(child)) {
          stack.push(child);
        }
      }
    } else {
      stack.pop();
      time++;
      onExit(node, time);
    }
  }
}

function zip(...arrays: any[]) {
  // Find the smallest array length to avoid undefined values
  const minLength = Math.min(...arrays.map((arr) => arr.length));
  return Array.from({ length: minLength }, (_, i) =>
    arrays.map((arr) => arr[i])
  );
}
