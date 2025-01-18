grammar FormLang
import "./terminals"
import "./type"
import "./component"

entry Model:
    (forms+=Form | components+=ComponentDef | typeDefs+=TypeDef)*;

Form:
    'form' name=ID '{' 
        component=FieldComponentDef
        (children+=FormChild)*
    '}';

Field:
    'field' name=ID '{'
        (state=FieldStateDef)? (component=FieldComponentDef)
    '}';

FieldStateDef:
    'state' type=(BuiltInType)IsArray ('default' defaultValue=ValueExpression)?;

BuiltInType returns string:
    ('string' | 'number' | 'boolean');


FieldComponentDef:
    'comp' componentId=[ComponentDef:ID] (componentPropsKeys+=ComponentDefPropKey '=' componentPropsValues+=ValueExpression)*;

ValueExpression:
    value=STRING(isExpression?='as' 'expression')?;

FormChild:
    (Form | Field);

