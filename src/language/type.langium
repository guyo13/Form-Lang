import "./terminals"

fragment IsArray:
    (isArray?='[]')?;

TypeDef:
    'type' name=ID '{'
        (properties+=TypeProperty)*
    '}'IsArray;

TypeProperty:
    name=ID ':' type=[TypeDef:ID]IsArray;