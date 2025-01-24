import type { ValidationAcceptor, ValidationChecks } from "langium";
import type {
  FormLangAstType,
  Model,
  Form,
  Field,
  TypeDef,
  FieldComponentDef,
  ComponentDef,
} from "./generated/ast.js";
import type { FormLangServices } from "./form-lang-module.js";
import { uniquePropertyValidator } from "@guyo13/langium-utils/validator-util";

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: FormLangServices) {
  const registry = services.validation.ValidationRegistry;
  const validator = services.validation.FormLangValidator;
  const checks: ValidationChecks<FormLangAstType> = {
    Model: validator.validateModel,
    Form: validator.validateForm,
    Field: validator.validateField,
    TypeDef: validator.validateTypeDef,
    FieldComponentDef: validator.validateFieldComponentDef,
    ComponentDef: validator.validateComponentDef,
  };
  registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class FormLangValidator {
  validateModel(model: Model, accept: ValidationAcceptor): void {
    this.uniqueFormIds(model, accept);
    this.uniqueComponentIds(model, accept);
    this.uniqueTypeDefIds(model, accept);
  }

  uniqueFormIds(model: Model, accept: ValidationAcceptor): void {
    return uniquePropertyValidator(
      model.forms,
      "name",
      accept,
      ({ propertyValue }) =>
        `Form names should be unique. Form '${propertyValue}' already defined.`,
    );
  }

  uniqueComponentIds(model: Model, accept: ValidationAcceptor): void {
    return uniquePropertyValidator(
      model.components,
      "name",
      accept,
      ({ propertyValue }) =>
        `Component names should be unique. Component '${propertyValue}' already defined.`,
    );
  }

  uniqueTypeDefIds(model: Model, accept: ValidationAcceptor): void {
    return uniquePropertyValidator(
      model.typeDefs,
      "name",
      accept,
      ({ propertyValue }) =>
        `TypeDef names should be unique. TypeDef '${propertyValue}' already defined.`,
    );
  }

  validateForm(form: Form, accept: ValidationAcceptor): void {
    this.uniqueNestedFormIds(form, accept);
  }

  uniqueNestedFormIds(form: Form, accept: ValidationAcceptor): void {
    return uniquePropertyValidator(
      form.children.filter((child) => child.$type === "Form") as Form[],
      "name",
      accept,
      ({ propertyValue }) =>
        `Nested form names should be unique within the form. Nested form '${propertyValue}' already defined.`,
    );
  }

  validateField(field: Field, accept: ValidationAcceptor): void {}

  validateTypeDef(typeDef: TypeDef, accept: ValidationAcceptor): void {}

  validateFieldComponentDef(
    fieldComponentDef: FieldComponentDef,
    accept: ValidationAcceptor,
  ): void {
    for (const propKey of fieldComponentDef.componentPropsKeys) {
      if (
        !fieldComponentDef.componentId.ref?.props?.find(
          (prop) => prop.key === propKey.key,
        )
      ) {
        accept(
          "error",
          `Property '${propKey.key}' is not defined in the component '${fieldComponentDef.componentId.ref?.name}'`,
          { node: propKey, property: "key" },
        );
      }
    }
  }

  validateComponentDef(
    componentDef: ComponentDef,
    accept: ValidationAcceptor,
  ): void {
    componentDef.props &&
      uniquePropertyValidator(
        componentDef.props,
        "key",
        accept,
        ({ propertyValue }) =>
          `ComponentDef property names should be unique. Property '${propertyValue}' already defined.`,
      );
  }
}
