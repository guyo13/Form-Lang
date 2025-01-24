grammar FormLang
import "./terminals"
import "./type"
import "./component"

entry Model:
    (forms+=Form | components+=ComponentDef | typeDefs+=TypeDef)*;

type FormChild = Form | Field;

type BuiltInType = 'string' | 'number' | 'boolean';

interface Form {
    name: string;
    component: FieldComponentDef;
    children: FormChild[];
}

interface Field {
    name: string;
    state: FieldStateDef;
    component: FieldComponentDef;
}

interface FieldStateDef {
    type: BuiltInType;
    isArray: boolean;
    defaultValue: ValueExpression;
}

interface FieldComponentDef {
    componentId: @ComponentDef;
    componentPropsKeys: ComponentPropKey[];
    componentPropsValues: ValueExpression[];
}

interface ValueExpression {
    value: string;
    isExpression: boolean;
}

Form returns Form:
    'form' name=ID '{' 
        component=FieldComponentDef
        (children+=FormChild)*
    '}';

Field returns Field:
    'field' name=ID '{'
        (state=FieldStateDef)? (component=FieldComponentDef)
    '}';

FieldStateDef returns FieldStateDef:
    'state' type=(BuiltInType)IsArray ('default' defaultValue=ValueExpression)?;

BuiltInType returns BuiltInType:
    ('string' | 'number' | 'boolean');


FieldComponentDef returns FieldComponentDef:
    'comp' componentId=[ComponentDef:ID] (componentPropsKeys+=ComponentPropKey '=' componentPropsValues+=ValueExpression)*;

ValueExpression returns ValueExpression:
    value=STRING(isExpression?='as' 'expression')?;

FormChild returns FormChild:
    (Form | Field);

