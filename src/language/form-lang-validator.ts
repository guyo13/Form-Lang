import type { ValidationAcceptor, ValidationChecks } from "langium";
import type { FormLangAstType, Model, Form } from "./generated/ast.js";
import type { FormLangServices } from "./form-lang-module.js";
import { uniquePropertyValidator } from "@guyo13/langium-utils/validator-util";

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: FormLangServices) {
  const registry = services.validation.ValidationRegistry;
  const validator = services.validation.FormLangValidator;
  const checks: ValidationChecks<FormLangAstType> = {
    Model: validator.uniqueFormIds,
    Form: validator.uniqueNestedFormIds,
  };
  registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class FormLangValidator {
  uniqueFormIds(model: Model, accept: ValidationAcceptor): void {
    return uniquePropertyValidator(
      model.forms,
      "name",
      accept,
      ({ propertyValue }) =>
        `Form names should be unique. Form '${propertyValue}' already defined.`
    );
  }
  uniqueNestedFormIds(form: Form, accept: ValidationAcceptor): void {
    return uniquePropertyValidator(
      form.children.filter((child) => child.$type === "Form"),
      "name",
      accept,
      ({ propertyValue }) =>
        `Nested form names should be unique within the form. Nested form '${propertyValue}' already defined.`
    );
  }
}
