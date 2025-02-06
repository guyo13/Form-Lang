const lib = require("../out/cjs/lib");

const form_components = `
component userDetailsContainer {}
component formContainer {}
component someOtherContainer {}
component OtherContainer2 {}
`;
const field_components = `
component myTextBox {
    props {
        textColor
        textSize
        textWeight
        borderColor
    }
}
component myCheckbox {
    props {
        size
    }
}
component otherTextBox {}
component counter {
    props {
        style
    }
}`;

const CODE =
  "form Yww {\n\tcomp OtherContainer2 \n\t\n\tfield g_wwwww {\n\t\tstate string[]\n\t\tcomp counter \n\t\t\n\t}\n}\n";

const AST_TO_CHECK =
  '{"$type":"Form","name":"Yww","component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@3"},"componentPropsKeys":[],"componentPropsValues":[]},"children":[{"$type":"Field","name":"g_wwwww","state":{"$type":"FieldStateDef","isArray":true,"type":"string"},"component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@7"},"componentPropsKeys":[],"componentPropsValues":[]}}]}';

(async () => {
  console.time("123");
  for (let i = 0; i < 1; i++) {
    const result = await lib.computeAndSerializeAst(
      CODE,
      form_components,
      field_components,
    );

    console.log(result === AST_TO_CHECK);
  }
  console.timeEnd("123");
})();
