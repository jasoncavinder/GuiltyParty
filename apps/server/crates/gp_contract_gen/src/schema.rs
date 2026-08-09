use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet};

const DIALECT: &str = "https://json-schema.org/draft/2020-12/schema";

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct Contract {
    pub(crate) title: String,
    pub(crate) definitions: BTreeMap<String, Schema>,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) enum Schema {
    Reference(String),
    String(StringRules),
    Integer(IntegerRules),
    Boolean,
    Null,
    Array(ArrayRules),
    Object(ObjectSchema),
    Nullable(Box<Schema>),
    OneOf(Vec<Schema>),
    AllOf(Vec<Schema>),
    StringConstant(String),
}

#[derive(Clone, Debug, Default, PartialEq)]
pub(crate) struct StringRules {
    pub(crate) minimum_length: Option<u64>,
    pub(crate) maximum_length: Option<u64>,
    pub(crate) pattern: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub(crate) struct IntegerRules {
    pub(crate) minimum: Option<i64>,
    pub(crate) maximum: Option<i64>,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ArrayRules {
    pub(crate) items: Box<Schema>,
    pub(crate) minimum_items: Option<u64>,
    pub(crate) maximum_items: Option<u64>,
    pub(crate) unique_items: bool,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub(crate) struct ObjectSchema {
    pub(crate) required: BTreeSet<String>,
    pub(crate) properties: BTreeMap<String, Schema>,
}

#[derive(Clone, Debug)]
pub(crate) struct UnionVariant {
    pub(crate) literal: String,
    pub(crate) type_name: String,
}

impl Contract {
    pub(crate) fn parse(source: &str) -> Result<Self, String> {
        let document: Value = serde_json::from_str(source)
            .map_err(|error| format!("canonical schema is not valid JSON: {error}"))?;
        let root = document
            .as_object()
            .ok_or_else(|| "canonical schema root must be an object".to_string())?;
        reject_unknown_keys(
            root,
            &["$schema", "$id", "title", "description", "$defs"],
            "schema root",
        )?;
        if root.get("$schema").and_then(Value::as_str) != Some(DIALECT) {
            return Err(format!("canonical schema must declare {DIALECT}"));
        }
        let title = optional_string(root, "title", "schema root")?.unwrap_or_default();
        let definitions = root
            .get("$defs")
            .and_then(Value::as_object)
            .ok_or_else(|| "canonical schema must contain an object $defs".to_string())?;
        if definitions.is_empty() {
            return Err("canonical schema $defs must not be empty".to_string());
        }

        let mut parsed = BTreeMap::new();
        for (name, value) in definitions {
            parsed.insert(name.clone(), parse_schema(value, &format!("$defs/{name}"))?);
        }
        let contract = Self {
            title,
            definitions: parsed,
        };
        contract.check_references()?;
        contract.check_reference_cycles()?;
        contract.check_unions()?;
        Ok(contract)
    }

    fn check_references(&self) -> Result<(), String> {
        fn walk(schema: &Schema, names: &BTreeSet<&str>) -> Result<(), String> {
            match schema {
                Schema::Reference(name) => {
                    if !names.contains(name.as_str()) {
                        return Err(format!("unresolved local reference #/$defs/{name}"));
                    }
                }
                Schema::Array(rules) => walk(&rules.items, names)?,
                Schema::Nullable(inner) => walk(inner, names)?,
                Schema::OneOf(children) | Schema::AllOf(children) => {
                    for child in children {
                        walk(child, names)?;
                    }
                }
                Schema::Object(object) => {
                    for property in object.properties.values() {
                        walk(property, names)?;
                    }
                }
                Schema::String(_)
                | Schema::Integer(_)
                | Schema::Boolean
                | Schema::Null
                | Schema::StringConstant(_) => {}
            }
            Ok(())
        }

        let names: BTreeSet<&str> = self.definitions.keys().map(String::as_str).collect();
        for schema in self.definitions.values() {
            walk(schema, &names)?;
        }
        Ok(())
    }

    fn check_reference_cycles(&self) -> Result<(), String> {
        fn collect_references(schema: &Schema, references: &mut BTreeSet<String>) {
            match schema {
                Schema::Reference(name) => {
                    references.insert(name.clone());
                }
                Schema::Array(rules) => collect_references(&rules.items, references),
                Schema::Nullable(inner) => collect_references(inner, references),
                Schema::OneOf(children) | Schema::AllOf(children) => {
                    for child in children {
                        collect_references(child, references);
                    }
                }
                Schema::Object(object) => {
                    for property in object.properties.values() {
                        collect_references(property, references);
                    }
                }
                Schema::String(_)
                | Schema::Integer(_)
                | Schema::Boolean
                | Schema::Null
                | Schema::StringConstant(_) => {}
            }
        }

        fn visit(
            contract: &Contract,
            name: &str,
            active: &mut BTreeSet<String>,
            completed: &mut BTreeSet<String>,
            path: &mut Vec<String>,
        ) -> Result<(), String> {
            if completed.contains(name) {
                return Ok(());
            }
            if !active.insert(name.to_string()) {
                let cycle_start = path.iter().position(|item| item == name).unwrap_or(0);
                let mut cycle = path[cycle_start..].to_vec();
                cycle.push(name.to_string());
                return Err(format!(
                    "recursive schema references are unsupported: {}",
                    cycle.join(" -> ")
                ));
            }

            path.push(name.to_string());
            let mut references = BTreeSet::new();
            collect_references(contract.definition(name)?, &mut references);
            for reference in references {
                visit(contract, &reference, active, completed, path)?;
            }
            path.pop();
            active.remove(name);
            completed.insert(name.to_string());
            Ok(())
        }

        let mut active = BTreeSet::new();
        let mut completed = BTreeSet::new();
        let mut path = Vec::new();
        for name in self.definitions.keys() {
            visit(self, name, &mut active, &mut completed, &mut path)?;
        }
        Ok(())
    }

    fn check_unions(&self) -> Result<(), String> {
        for (name, schema) in &self.definitions {
            self.check_schema_unions(schema, name)?;
        }
        Ok(())
    }

    fn check_schema_unions(&self, schema: &Schema, context: &str) -> Result<(), String> {
        match schema {
            Schema::OneOf(_) => {
                self.discriminated_variants(schema, context)?;
            }
            Schema::Object(object) => {
                for (name, property) in &object.properties {
                    self.check_schema_unions(property, &format!("{context}.{name}"))?;
                }
            }
            Schema::Array(rules) => self.check_schema_unions(&rules.items, context)?,
            Schema::Nullable(inner) => self.check_schema_unions(inner, context)?,
            Schema::AllOf(children) => {
                for child in children {
                    self.check_schema_unions(child, context)?;
                }
            }
            Schema::Reference(_)
            | Schema::String(_)
            | Schema::Integer(_)
            | Schema::Boolean
            | Schema::Null
            | Schema::StringConstant(_) => {}
        }
        Ok(())
    }

    pub(crate) fn definition(&self, name: &str) -> Result<&Schema, String> {
        self.definitions
            .get(name)
            .ok_or_else(|| format!("unknown definition {name}"))
    }

    pub(crate) fn dereference<'a>(&'a self, schema: &'a Schema) -> Result<&'a Schema, String> {
        let mut current = schema;
        let mut visited = BTreeSet::new();
        while let Schema::Reference(name) = current {
            if !visited.insert(name.as_str()) {
                return Err(format!("cyclic reference involving {name}"));
            }
            current = self.definition(name)?;
        }
        Ok(current)
    }

    pub(crate) fn effective_object(&self, schema: &Schema) -> Result<ObjectSchema, String> {
        let object = self.effective_object_unchecked(schema)?;
        for name in &object.required {
            if !object.properties.contains_key(name) {
                return Err(format!(
                    "required property {name:?} is undefined after allOf merge"
                ));
            }
        }
        Ok(object)
    }

    fn effective_object_unchecked(&self, schema: &Schema) -> Result<ObjectSchema, String> {
        match self.dereference(schema)? {
            Schema::Object(object) => Ok(object.clone()),
            Schema::AllOf(children) => {
                let mut result = ObjectSchema::default();
                for child in children {
                    let object = self.effective_object_unchecked(child)?;
                    result.required.extend(object.required);
                    for (name, property) in object.properties {
                        if let Some(existing) = result.properties.get(&name) {
                            if existing != &property
                                && !self.is_supported_refinement(existing, &property)?
                            {
                                return Err(format!(
                                    "unsupported allOf overlap for property {name:?}"
                                ));
                            }
                        }
                        result.properties.insert(name, property);
                    }
                }
                Ok(result)
            }
            other => Err(format!("expected object schema, found {other:?}")),
        }
    }

    fn is_supported_refinement(&self, base: &Schema, refinement: &Schema) -> Result<bool, String> {
        match (self.dereference(base)?, self.dereference(refinement)?) {
            (Schema::String(rules), Schema::StringConstant(value)) => {
                if rules.pattern.is_some() {
                    return Ok(false);
                }
                let length = value.chars().count() as u64;
                Ok(rules.minimum_length.is_none_or(|minimum| length >= minimum)
                    && rules.maximum_length.is_none_or(|maximum| length <= maximum))
            }
            (Schema::Object(object), _)
                if object.required.is_empty() && object.properties.is_empty() =>
            {
                self.is_object_shaped(refinement)
            }
            _ => Ok(false),
        }
    }

    fn is_object_shaped(&self, schema: &Schema) -> Result<bool, String> {
        match self.dereference(schema)? {
            Schema::Object(_) | Schema::AllOf(_) => Ok(true),
            Schema::OneOf(children) => {
                for child in children {
                    if self.effective_object(child).is_err() {
                        return Ok(false);
                    }
                }
                Ok(true)
            }
            _ => Ok(false),
        }
    }

    pub(crate) fn discriminated_variants(
        &self,
        schema: &Schema,
        union_name: &str,
    ) -> Result<(String, Vec<UnionVariant>), String> {
        let children = match self.dereference(schema)? {
            Schema::OneOf(children) => children,
            other => return Err(format!("{union_name} is not a union: {other:?}")),
        };
        if children.len() < 2 {
            return Err(format!(
                "{union_name} oneOf must contain at least two variants"
            ));
        }

        let mut discriminator: Option<String> = None;
        let mut literals = BTreeSet::new();
        let mut variants = Vec::new();
        for (index, child) in children.iter().enumerate() {
            let object = self.effective_object(child).map_err(|_| {
                format!(
                    "{union_name} variant {} must resolve to an object",
                    index + 1
                )
            })?;
            let constants: Vec<(&String, &String)> = object
                .properties
                .iter()
                .filter_map(|(name, property)| match property {
                    Schema::StringConstant(value) if object.required.contains(name) => {
                        Some((name, value))
                    }
                    _ => None,
                })
                .collect();
            if constants.len() != 1 {
                return Err(format!(
                    "{union_name} variant {} must have exactly one required string discriminator",
                    index + 1
                ));
            }
            let (field, literal) = constants[0];
            if let Some(expected) = &discriminator {
                if field != expected {
                    return Err(format!(
                        "{union_name} mixes discriminator fields {expected:?} and {field:?}"
                    ));
                }
            } else {
                discriminator = Some(field.clone());
            }
            if !literals.insert(literal.clone()) {
                return Err(format!("{union_name} repeats discriminator {literal:?}"));
            }
            let type_name = match child {
                Schema::Reference(name) => name.clone(),
                _ => format!("{union_name}{}", pascal_case(literal)),
            };
            variants.push(UnionVariant {
                literal: literal.clone(),
                type_name,
            });
        }
        Ok((discriminator.expect("union has children"), variants))
    }

    pub(crate) fn named_schemas(&self) -> Result<BTreeMap<String, Schema>, String> {
        let mut named = self.definitions.clone();
        loop {
            let before = named.len();
            let snapshot: Vec<(String, Schema)> = named
                .iter()
                .map(|(name, schema)| (name.clone(), schema.clone()))
                .collect();
            for (name, schema) in snapshot {
                self.collect_inline(&name, &schema, &mut named)?;
            }
            if named.len() == before {
                return Ok(named);
            }
        }
    }

    fn collect_inline(
        &self,
        name: &str,
        schema: &Schema,
        named: &mut BTreeMap<String, Schema>,
    ) -> Result<(), String> {
        match self.dereference(schema)? {
            Schema::Object(_) | Schema::AllOf(_) => {
                let object = self.effective_object(schema)?;
                for (property_name, property) in object.properties {
                    let child_name = format!("{name}{}", pascal_case(&property_name));
                    self.insert_inline(&child_name, &property, named)?;
                }
            }
            Schema::OneOf(children) => {
                let (_, variants) = self.discriminated_variants(schema, name)?;
                for (child, variant) in children.iter().zip(variants) {
                    if !matches!(child, Schema::Reference(_)) {
                        insert_consistent(named, variant.type_name, child.clone())?;
                    }
                }
            }
            Schema::Array(rules) => {
                self.insert_inline(&format!("{name}Item"), &rules.items, named)?
            }
            Schema::Nullable(inner) => self.insert_inline(name, inner, named)?,
            Schema::Reference(_)
            | Schema::String(_)
            | Schema::Integer(_)
            | Schema::Boolean
            | Schema::Null
            | Schema::StringConstant(_) => {}
        }
        Ok(())
    }

    fn insert_inline(
        &self,
        name: &str,
        schema: &Schema,
        named: &mut BTreeMap<String, Schema>,
    ) -> Result<(), String> {
        match self.dereference(schema)? {
            Schema::Object(_) | Schema::OneOf(_) | Schema::AllOf(_) => {
                insert_consistent(named, name.to_string(), schema.clone())?;
            }
            Schema::Array(rules) => {
                self.insert_inline(&format!("{name}Item"), &rules.items, named)?;
            }
            Schema::Nullable(inner) => self.insert_inline(name, inner, named)?,
            _ => {}
        }
        Ok(())
    }
}

fn parse_schema(value: &Value, path: &str) -> Result<Schema, String> {
    let object = value
        .as_object()
        .ok_or_else(|| format!("{path}: schema node must be an object"))?;
    reject_unknown_keys(
        object,
        &[
            "$ref",
            "type",
            "const",
            "description",
            "title",
            "format",
            "writeOnly",
            "minLength",
            "maxLength",
            "pattern",
            "minimum",
            "maximum",
            "minItems",
            "maxItems",
            "uniqueItems",
            "items",
            "required",
            "properties",
            "oneOf",
            "allOf",
        ],
        path,
    )?;

    if let Some(reference) = object.get("$ref") {
        reject_unknown_keys(
            object,
            &["$ref", "description", "title", "format", "writeOnly"],
            path,
        )?;
        let reference = reference
            .as_str()
            .ok_or_else(|| format!("{path}: $ref must be a string"))?;
        let name = reference
            .strip_prefix("#/$defs/")
            .filter(|name| !name.is_empty() && !name.contains('/'))
            .ok_or_else(|| format!("{path}: only direct local $defs references are supported"))?;
        return Ok(Schema::Reference(name.to_string()));
    }
    if let Some(children) = object.get("allOf") {
        reject_unknown_keys(object, &["allOf", "description", "title"], path)?;
        return Ok(Schema::AllOf(parse_children(children, path, "allOf")?));
    }
    if let Some(children) = object.get("oneOf") {
        reject_unknown_keys(object, &["oneOf", "description", "title"], path)?;
        let mut parsed = parse_children(children, path, "oneOf")?;
        if parsed.len() == 2 {
            if let Some(null_index) = parsed.iter().position(|child| *child == Schema::Null) {
                let other = parsed.remove(1 - null_index);
                return Ok(Schema::Nullable(Box::new(other)));
            }
        }
        return Ok(Schema::OneOf(parsed));
    }
    if let Some(constant) = object.get("const") {
        reject_unknown_keys(object, &["const", "type", "description", "title"], path)?;
        if let Some(kind) = object.get("type") {
            if kind.as_str() != Some("string") {
                return Err(format!(
                    "{path}: string const must have string type when declared"
                ));
            }
        }
        return constant
            .as_str()
            .map(|value| Schema::StringConstant(value.to_string()))
            .ok_or_else(|| format!("{path}: only string const values are supported"));
    }

    match object.get("type") {
        Some(Value::String(kind)) => parse_typed_schema(kind, object, path),
        Some(Value::Array(kinds)) => {
            let names: Vec<&str> = kinds
                .iter()
                .map(|kind| {
                    kind.as_str()
                        .ok_or_else(|| format!("{path}: type array values must be strings"))
                })
                .collect::<Result<_, _>>()?;
            if names.len() == 2 && names.iter().filter(|name| **name == "null").count() == 1 {
                let non_null = names
                    .iter()
                    .find(|name| **name != "null")
                    .ok_or_else(|| format!("{path}: nullable type array has no non-null type"))?;
                return Ok(Schema::Nullable(Box::new(parse_typed_schema(
                    non_null, object, path,
                )?)));
            }
            Err(format!(
                "{path}: only a two-item nullable type array with one null and one non-null type is supported"
            ))
        }
        _ => Err(format!(
            "{path}: schema node has no supported type, ref, or composition"
        )),
    }
}

fn parse_typed_schema(
    kind: &str,
    object: &Map<String, Value>,
    path: &str,
) -> Result<Schema, String> {
    match kind {
        "string" => {
            reject_unknown_keys(
                object,
                &[
                    "type",
                    "description",
                    "title",
                    "format",
                    "writeOnly",
                    "minLength",
                    "maxLength",
                    "pattern",
                ],
                path,
            )?;
            Ok(Schema::String(StringRules {
                minimum_length: optional_u64(object, "minLength", path)?,
                maximum_length: optional_u64(object, "maxLength", path)?,
                pattern: optional_string(object, "pattern", path)?,
            }))
        }
        "integer" => {
            reject_unknown_keys(
                object,
                &["type", "description", "title", "minimum", "maximum"],
                path,
            )?;
            let minimum = optional_i64(object, "minimum", path)?.ok_or_else(|| {
                format!("{path}: integer schemas must declare a signed 64-bit minimum")
            })?;
            let maximum = optional_i64(object, "maximum", path)?.ok_or_else(|| {
                format!("{path}: integer schemas must declare a signed 64-bit maximum")
            })?;
            if minimum > maximum {
                return Err(format!(
                    "{path}: integer minimum {minimum} exceeds maximum {maximum}"
                ));
            }
            Ok(Schema::Integer(IntegerRules {
                minimum: Some(minimum),
                maximum: Some(maximum),
            }))
        }
        "boolean" => {
            reject_unknown_keys(object, &["type", "description", "title"], path)?;
            Ok(Schema::Boolean)
        }
        "null" => {
            reject_unknown_keys(object, &["type", "description", "title"], path)?;
            Ok(Schema::Null)
        }
        "array" => {
            reject_unknown_keys(
                object,
                &[
                    "type",
                    "description",
                    "title",
                    "items",
                    "minItems",
                    "maxItems",
                    "uniqueItems",
                ],
                path,
            )?;
            let items = object
                .get("items")
                .ok_or_else(|| format!("{path}: arrays must declare items"))?;
            let minimum_items = optional_u64(object, "minItems", path)?;
            let maximum_items = optional_u64(object, "maxItems", path)?;
            if matches!((minimum_items, maximum_items), (Some(minimum), Some(maximum)) if minimum > maximum)
            {
                return Err(format!("{path}: array minItems exceeds maxItems"));
            }
            Ok(Schema::Array(ArrayRules {
                items: Box::new(parse_schema(items, &format!("{path}/items"))?),
                minimum_items,
                maximum_items,
                unique_items: optional_bool(object, "uniqueItems", path)?.unwrap_or(false),
            }))
        }
        "object" => {
            reject_unknown_keys(
                object,
                &["type", "description", "title", "required", "properties"],
                path,
            )?;
            let required = match object.get("required") {
                Some(Value::Array(values)) => values
                    .iter()
                    .map(|value| {
                        value
                            .as_str()
                            .map(str::to_string)
                            .ok_or_else(|| format!("{path}: required values must be strings"))
                    })
                    .collect::<Result<BTreeSet<_>, _>>()?,
                Some(_) => return Err(format!("{path}: required must be an array")),
                None => BTreeSet::new(),
            };
            let mut properties = BTreeMap::new();
            match object.get("properties") {
                Some(Value::Object(values)) => {
                    for (name, value) in values {
                        properties.insert(
                            name.clone(),
                            parse_schema(value, &format!("{path}/properties/{name}"))?,
                        );
                    }
                }
                Some(_) => return Err(format!("{path}: properties must be an object")),
                None => {}
            }
            Ok(Schema::Object(ObjectSchema {
                required,
                properties,
            }))
        }
        other => Err(format!("{path}: unsupported schema type {other:?}")),
    }
}

fn parse_children(value: &Value, path: &str, keyword: &str) -> Result<Vec<Schema>, String> {
    let values = value
        .as_array()
        .ok_or_else(|| format!("{path}: {keyword} must be an array"))?;
    if values.is_empty() {
        return Err(format!("{path}: {keyword} must not be empty"));
    }
    values
        .iter()
        .enumerate()
        .map(|(index, child)| parse_schema(child, &format!("{path}/{keyword}/{index}")))
        .collect()
}

fn reject_unknown_keys(
    object: &Map<String, Value>,
    allowed: &[&str],
    path: &str,
) -> Result<(), String> {
    let allowed: BTreeSet<&str> = allowed.iter().copied().collect();
    if let Some(key) = object.keys().find(|key| !allowed.contains(key.as_str())) {
        return Err(format!("{path}: unsupported schema keyword {key:?}"));
    }
    Ok(())
}

fn optional_string(
    object: &Map<String, Value>,
    key: &str,
    path: &str,
) -> Result<Option<String>, String> {
    match object.get(key) {
        Some(Value::String(value)) => Ok(Some(value.clone())),
        Some(_) => Err(format!("{path}: {key} must be a string")),
        None => Ok(None),
    }
}

fn optional_u64(object: &Map<String, Value>, key: &str, path: &str) -> Result<Option<u64>, String> {
    match object.get(key) {
        Some(Value::Number(value)) => value
            .as_u64()
            .map(Some)
            .ok_or_else(|| format!("{path}: {key} must be a non-negative integer")),
        Some(_) => Err(format!("{path}: {key} must be an integer")),
        None => Ok(None),
    }
}

fn optional_i64(object: &Map<String, Value>, key: &str, path: &str) -> Result<Option<i64>, String> {
    match object.get(key) {
        Some(Value::Number(value)) => value
            .as_i64()
            .map(Some)
            .ok_or_else(|| format!("{path}: {key} must fit a signed 64-bit integer")),
        Some(_) => Err(format!("{path}: {key} must be an integer")),
        None => Ok(None),
    }
}

fn optional_bool(
    object: &Map<String, Value>,
    key: &str,
    path: &str,
) -> Result<Option<bool>, String> {
    match object.get(key) {
        Some(Value::Bool(value)) => Ok(Some(*value)),
        Some(_) => Err(format!("{path}: {key} must be a boolean")),
        None => Ok(None),
    }
}

fn insert_consistent(
    values: &mut BTreeMap<String, Schema>,
    name: String,
    schema: Schema,
) -> Result<(), String> {
    if let Some(existing) = values.get(&name) {
        if existing != &schema {
            return Err(format!("generated type name collision for {name}"));
        }
    } else {
        values.insert(name, schema);
    }
    Ok(())
}

pub(crate) fn pascal_case(value: &str) -> String {
    let mut output = String::new();
    let mut uppercase = true;
    for character in value.chars() {
        if character.is_ascii_alphanumeric() {
            if uppercase {
                output.extend(character.to_uppercase());
                uppercase = false;
            } else {
                output.push(character);
            }
        } else {
            uppercase = true;
        }
    }
    if output.is_empty() {
        "Value".to_string()
    } else if output.starts_with(|character: char| character.is_ascii_digit()) {
        format!("Value{output}")
    } else {
        output
    }
}

pub(crate) fn camel_case(value: &str) -> String {
    let pascal = pascal_case(value);
    let mut characters = pascal.chars();
    match characters.next() {
        Some(first) => first.to_lowercase().chain(characters).collect(),
        None => "value".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn production_schema() -> Contract {
        Contract::parse(include_str!(
            "../../../../../contracts/control-plane/v1/control-plane.schema.json"
        ))
        .expect("production schema must parse")
    }

    #[test]
    fn preserves_required_nullable_and_optional_non_nullable_fields() {
        let contract = production_schema();
        let response = contract
            .effective_object(contract.definition("JoinResponse").unwrap())
            .unwrap();
        assert!(response.required.contains("participant_id"));
        assert!(matches!(
            response.properties.get("participant_id"),
            Some(Schema::Nullable(_))
        ));

        let participant = contract
            .effective_object(contract.definition("ProjectedParticipant").unwrap())
            .unwrap();
        assert!(!participant.required.contains("private_objective"));
        assert!(matches!(
            participant.properties.get("private_objective"),
            Some(Schema::String(_))
        ));
    }

    #[test]
    fn preserves_discriminated_unions() {
        let contract = production_schema();
        let (command_field, commands) = contract
            .discriminated_variants(
                contract.definition("ClientCommand").unwrap(),
                "ClientCommand",
            )
            .unwrap();
        assert_eq!(command_field, "type");
        assert_eq!(commands.len(), 6);
        assert_eq!(commands[4].literal, "cast_vote");

        let (join_field, joins) = contract
            .discriminated_variants(contract.definition("JoinRequest").unwrap(), "JoinRequest")
            .unwrap();
        assert_eq!(join_field, "kind");
        assert_eq!(
            joins
                .iter()
                .map(|item| item.literal.as_str())
                .collect::<Vec<_>>(),
            vec!["participant", "stage"]
        );
    }

    #[test]
    fn rejects_unknown_schema_keywords() {
        let source = r#"{
          "$schema":"https://json-schema.org/draft/2020-12/schema",
          "$defs":{"Thing":{"type":"string","default":"unsafe"}}
        }"#;
        let error = Contract::parse(source).unwrap_err();
        assert!(error.contains("unsupported schema keyword \"default\""));
    }

    #[test]
    fn rejects_semantic_keywords_that_would_be_ignored() {
        let source = r##"{
          "$schema":"https://json-schema.org/draft/2020-12/schema",
          "$defs":{
            "Identifier":{"type":"string"},
            "Thing":{"$ref":"#/$defs/Identifier","minimum":1}
          }
        }"##;
        let error = Contract::parse(source).unwrap_err();
        assert!(error.contains("unsupported schema keyword \"minimum\""));
    }

    #[test]
    fn rejects_nonlocal_and_nested_references() {
        for reference in [
            "https://example.invalid/schema.json",
            "#/$defs/Thing/properties/value",
        ] {
            let source = format!(
                r#"{{
                  "$schema":"https://json-schema.org/draft/2020-12/schema",
                  "$defs":{{"Thing":{{"$ref":{}}}}}
                }}"#,
                serde_json::to_string(reference).unwrap()
            );
            let error = Contract::parse(&source).unwrap_err();
            assert!(error.contains("only direct local $defs references are supported"));
        }
    }

    #[test]
    fn rejects_recursive_schema_references_before_expansion() {
        let source = r##"{
          "$schema":"https://json-schema.org/draft/2020-12/schema",
          "$defs":{
            "Node":{
              "type":"object",
              "properties":{"child":{"$ref":"#/$defs/Node"}}
            }
          }
        }"##;
        let error = Contract::parse(source).unwrap_err();
        assert!(error.contains("recursive schema references are unsupported"));
        assert!(error.contains("Node -> Node"));
    }

    #[test]
    fn rejects_malformed_nullable_type_arrays_without_panicking() {
        for kinds in [r#"["null","null"]"#, r#"["string","string"]"#] {
            let source = format!(
                r#"{{
                  "$schema":"https://json-schema.org/draft/2020-12/schema",
                  "$defs":{{"Thing":{{"type":{kinds}}}}}
                }}"#
            );
            let error = Contract::parse(&source).unwrap_err();
            assert!(error.contains("one null and one non-null type"));
        }
    }

    #[test]
    fn rejects_unbounded_or_reversed_integer_domains() {
        for integer in [
            r#"{"type":"integer","minimum":0}"#,
            r#"{"type":"integer","maximum":10}"#,
            r#"{"type":"integer","minimum":10,"maximum":0}"#,
        ] {
            let source = format!(
                r#"{{
                  "$schema":"https://json-schema.org/draft/2020-12/schema",
                  "$defs":{{"Thing":{integer}}}
                }}"#
            );
            assert!(Contract::parse(&source).is_err());
        }
    }

    #[test]
    fn preserves_bounded_array_domains_and_rejects_reversed_bounds() {
        let source = r#"{
          "$schema":"https://json-schema.org/draft/2020-12/schema",
          "$defs":{
            "Thing":{
              "type":"array",
              "minItems":1,
              "maxItems":3,
              "items":{"type":"string"}
            }
          }
        }"#;
        let contract = Contract::parse(source).unwrap();
        assert!(matches!(
            contract.definition("Thing"),
            Ok(Schema::Array(ArrayRules {
                minimum_items: Some(1),
                maximum_items: Some(3),
                ..
            }))
        ));

        let reversed = source.replace("\"minItems\":1", "\"minItems\":4");
        assert!(Contract::parse(&reversed)
            .unwrap_err()
            .contains("array minItems exceeds maxItems"));
    }

    #[test]
    fn rejects_ambiguous_all_of_property_overrides() {
        let source = r#"{
          "$schema":"https://json-schema.org/draft/2020-12/schema",
          "$defs":{
            "Thing":{
              "allOf":[
                {"type":"object","properties":{"value":{"type":"integer","minimum":0,"maximum":20}}},
                {"type":"object","properties":{"value":{"type":"integer","minimum":0,"maximum":10}}}
              ]
            }
          }
        }"#;
        let contract = Contract::parse(source).unwrap();
        let error = contract
            .effective_object(contract.definition("Thing").unwrap())
            .unwrap_err();
        assert!(error.contains("unsupported allOf overlap"));
    }

    #[test]
    fn named_schema_expansion_is_deterministic() {
        let contract = production_schema();
        let first: Vec<String> = contract.named_schemas().unwrap().into_keys().collect();
        let second: Vec<String> = contract.named_schemas().unwrap().into_keys().collect();
        assert_eq!(first, second);
        assert!(first.contains(&"SubmitCommandEnvelopePayload".to_string()));
        assert!(first.contains(&"JoinRequestParticipant".to_string()));
    }
}
