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
  '\n  component userDetailsContainer {}\n  component formContainer {}\n  component someOtherContainer {}\n  component OtherContainer2 {}\n\n\n  component myTextBox {\n    props {\n      textColor\n      textSize\n      textWeight\n      borderColor\n    }\n  }\n  component myCheckbox {\n    props {\n      size\n    }\n  }\n  component otherTextBox {}\n  component counter {\n    props {\n      style\n    }\n  }\n\nform U {\n\tcomp userDetailsContainer \n\t\n\tfield Gw {\n\t\tstate boolean[]\n\t\tcomp myCheckbox size="Math.abs(-5)" as expression\n\t\t\n\t}\n\tfield Ww {\n\t\tcomp myCheckbox size="(() => 63.72431654199994)()" as expression\n\t\t\n\t}\n\tform Aww {\n\t\tcomp OtherContainer2 \n\t\t\n\t\tfield ew {\n\t\t\tstate number default "0.5066617595169384" as expression\n\t\t\tcomp otherTextBox \n\t\t\t\n\t\t}\n\t\tfield R {\n\t\t\tstate string default "Pam Kreiger"\n\t\t\tcomp myTextBox textWeight="#52492b" textColor="Object.keys({name: \'John\', age: 30})" as expression borderColor="#561026" textSize="#5e3f13"\n\t\t\t\n\t\t}\n\t\tfield m {\n\t\t\tstate boolean default "false" as expression\n\t\t\tcomp myCheckbox size="new Date().getFullYear()" as expression\n\t\t\t\n\t\t}\n\t\tfield F_ {\n\t\t\tstate string\n\t\t\tcomp otherTextBox \n\t\t\t\n\t\t}\n\t}\n\n\tfield o {\n\t\tcomp otherTextBox \n\t\t\n\t}\n\tfield Q_ {\n\t\tstate number\n\t\tcomp myCheckbox size="(() => 35.24368901423281)()" as expression\n\t\t\n\t}\n\tfield Z {\n\t\tstate boolean\n\t\tcomp counter style="#29540f"\n\t\t\n\t}\n}\n';
const AST_TO_CHECK =
  '{"$type":"Form","name":"U","component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@0"},"componentPropsKeys":[],"componentPropsValues":[]},"children":[{"$type":"Field","name":"Gw","state":{"$type":"FieldStateDef","isArray":true,"type":"boolean"},"component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@5"},"componentPropsKeys":[{"$type":"ComponentPropKey","key":"size"}],"componentPropsValues":[{"$type":"ValueExpression","value":"Math.abs(-5)","isExpression":true}]}},{"$type":"Field","name":"Ww","component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@5"},"componentPropsKeys":[{"$type":"ComponentPropKey","key":"size"}],"componentPropsValues":[{"$type":"ValueExpression","value":"(() => 63.72431654199994)()","isExpression":true}]}},{"$type":"Form","name":"Aww","component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@3"},"componentPropsKeys":[],"componentPropsValues":[]},"children":[{"$type":"Field","name":"ew","state":{"$type":"FieldStateDef","type":"number","defaultValue":{"$type":"ValueExpression","value":"0.5066617595169384","isExpression":true},"isArray":false},"component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@6"},"componentPropsKeys":[],"componentPropsValues":[]}},{"$type":"Field","name":"R","state":{"$type":"FieldStateDef","type":"string","defaultValue":{"$type":"ValueExpression","value":"Pam Kreiger","isExpression":false},"isArray":false},"component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@4"},"componentPropsKeys":[{"$type":"ComponentPropKey","key":"textWeight"},{"$type":"ComponentPropKey","key":"textColor"},{"$type":"ComponentPropKey","key":"borderColor"},{"$type":"ComponentPropKey","key":"textSize"}],"componentPropsValues":[{"$type":"ValueExpression","value":"#52492b","isExpression":false},{"$type":"ValueExpression","value":"Object.keys({name: \'John\', age: 30})","isExpression":true},{"$type":"ValueExpression","value":"#561026","isExpression":false},{"$type":"ValueExpression","value":"#5e3f13","isExpression":false}]}},{"$type":"Field","name":"m","state":{"$type":"FieldStateDef","type":"boolean","defaultValue":{"$type":"ValueExpression","value":"false","isExpression":true},"isArray":false},"component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@5"},"componentPropsKeys":[{"$type":"ComponentPropKey","key":"size"}],"componentPropsValues":[{"$type":"ValueExpression","value":"new Date().getFullYear()","isExpression":true}]}},{"$type":"Field","name":"F_","state":{"$type":"FieldStateDef","type":"string","isArray":false},"component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@6"},"componentPropsKeys":[],"componentPropsValues":[]}}]},{"$type":"Field","name":"o","component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@6"},"componentPropsKeys":[],"componentPropsValues":[]}},{"$type":"Field","name":"Q_","state":{"$type":"FieldStateDef","type":"number","isArray":false},"component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@5"},"componentPropsKeys":[{"$type":"ComponentPropKey","key":"size"}],"componentPropsValues":[{"$type":"ValueExpression","value":"(() => 35.24368901423281)()","isExpression":true}]}},{"$type":"Field","name":"Z","state":{"$type":"FieldStateDef","type":"boolean","isArray":false},"component":{"$type":"FieldComponentDef","componentId":{"$ref":"#/components@7"},"componentPropsKeys":[{"$type":"ComponentPropKey","key":"style"}],"componentPropsValues":[{"$type":"ValueExpression","value":"#29540f","isExpression":false}]}}]}';
(async () => {
  console.time("123");
  for (let i = 0; i < 1; i++) {
    const { ast: result } = await lib.computeAndSerializeAst(
      CODE,
      form_components,
      field_components,
    );

    console.log(result === AST_TO_CHECK);
  }
  console.timeEnd("123");
})();
