import "./terminals"

ComponentDef:
    'component' name=ID '{'
        (props=ComponentDefProps)?
    '}';

ComponentDefProps:
    'props' '{'
        (properties+=ComponentDefPropKey)*
    '}';

ComponentDefPropKey:
    key=ID;