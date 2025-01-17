export interface ICompilerConfig {
  components: {
    [key: string]: IComponentConfig;
  };
}

export interface IComponentConfig {
  path: string;
  importSymbolName: string;
  importSymbolAlias?: string;
  stateManagement?: IComponentStateManagement;
}

export interface IComponentStateManagement {
  valuePropName: string;
  valueSetterPropName: string;
}
