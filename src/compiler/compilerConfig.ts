export interface ICompilerConfig {
  components: {
    [key: string]: IComponentConfig;
  };
}

export interface IComponentImportConfig {
  path: string;
  importSymbolName: string;
  importSymbolAlias?: string;
}

export interface IComponentStateManagement {
  valuePropName: string;
  valueSetterPropName: string;
}

export interface IComponentConfig extends IComponentImportConfig {
  stateManagement?: IComponentStateManagement;
}
