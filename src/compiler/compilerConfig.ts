export interface ICompilerConfig {
  components: {
    [key: string]: IComponentConfig;
  };
}

export interface IComponentConfig {
  path: string;
  importSymbolName: string;
  importSymbolAlias?: string;
}
