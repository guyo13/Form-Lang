import "./terminals"

interface ComponentDef {
    name: string;
    props: ComponentPropKey[];
}

interface ComponentPropKey {
    key: string;
}

ComponentDef returns ComponentDef:
    'component' name=ID '{'
        ComponentDefProps?
    '}';

fragment ComponentDefProps:
    'props' '{'
        (props+=ComponentPropKey)*
    '}';

ComponentPropKey returns ComponentPropKey:
    key=ID;