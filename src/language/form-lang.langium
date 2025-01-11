grammar FormLang

entry Model:
    (forms+=Form | components+=ComponentDef | typeDefs+=TypeDef)*;

TypeDef:
    'type' name=ID '{'
        (properties+=TypeProperty)*
    '}';

TypeProperty:
    name=ID ':' type=[TypeDef:ID];

ComponentDef:
    'component' name=ID '{'
        (properties+=ComponentDefPropKey)*
    '}';

ComponentDefPropKey:
    key=ID;

Form:
    'form' name=ID '{' 
        (children+=FormChild)*
    '}';

Field:
    'field' name=ID '{'
        (type=FieldTypeDef & component=FieldComponentDef)
    '}';

FieldTypeDef:
    'type' type=[TypeDef:ID];

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
