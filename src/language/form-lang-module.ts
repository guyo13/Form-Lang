import {
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  inject,
  type LangiumSharedCoreServices,
  type Module,
} from "langium";
import {
  type DefaultSharedModuleContext,
  type LangiumServices,
  type PartialLangiumServices,
} from "langium/lsp";
import {
  FormLangGeneratedModule,
  FormLangGeneratedSharedModule,
} from "./generated/module.js";
import {
  FormLangValidator,
  registerValidationChecks,
} from "./form-lang-validator.js";

/**
 * Declaration of custom services - add your own service classes here.
 */
export type FormLangAddedServices = {
  validation: {
    FormLangValidator: FormLangValidator;
  };
};

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type FormLangServices = LangiumServices & FormLangAddedServices;

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const FormLangModule: Module<
  FormLangServices,
  PartialLangiumServices & FormLangAddedServices
> = {
  validation: {
    FormLangValidator: () => new FormLangValidator(),
  },
};

export function createFormLangServicesWithoutLsp(
  context: DefaultSharedModuleContext,
): {
  shared: LangiumSharedCoreServices;
  FormLang: FormLangServices;
} {
  const shared = inject(
    createDefaultSharedCoreModule(context),
    FormLangGeneratedSharedModule,
  );
  const FormLang = inject(
    createDefaultCoreModule({ shared }),
    FormLangGeneratedModule,
    FormLangModule,
  );
  shared.ServiceRegistry.register(FormLang);
  registerValidationChecks(FormLang);
  if (!context.connection) {
    // We don't run inside a language server
    // Therefore, initialize the configuration provider instantly
    shared.workspace.ConfigurationProvider.initialized({});
  }
  return { shared, FormLang };
}
