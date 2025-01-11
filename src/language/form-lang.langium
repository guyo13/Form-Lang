grammar FormLang

entry Model:
    (forms+=Form)*;

Form:
    'form' name=ID '{' 
        (children+=FormChild)*
    '}';

Field:
    'field' name=ID '{'
        (FieldTypeDef & FieldComponentDef)
    '}';

FieldTypeDef:
    'type' type=STRING;

FieldComponentDef:
    'comp' componentId=ID;

FormChild:
    (Form | Field);

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
