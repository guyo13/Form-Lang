grammar FormLang

entry Model:
    (forms+=Form | components+=ComponentDef | typeDefs+=TypeDef)*;

TypeDef:
    'type' name=ID '{'
        (properties+=TypeProperty)*
    '}'(isArray?='[]')?;

TypeProperty:
    name=ID ':' type=[TypeDef:ID](isArray?='[]')?;

ComponentDef:
    'component' name=ID '{'
        (properties+=ComponentDefPropKey)*
    '}';

ComponentDefPropKey:
    key=ID;

Form:
    'form' name=ID '{' 
        component=FieldComponentDef
        (children+=FormChild)*
    '}';

Field:
    'field' name=ID '{'
        (state=FieldStateDef & component=FieldComponentDef)
    '}';

FieldStateDef:
    'state' type=[TypeDef:ID](isArray?='[]')?;

FieldComponentDef:
    'comp' componentId=[ComponentDef:ID] (componentPropsKeys+=ComponentDefPropKey '=' componentPropsValues+=FieldComponentDefPropValue)*;

FieldComponentDefPropValue:
    value=STRING;

FormChild:
    (Form | Field);

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
