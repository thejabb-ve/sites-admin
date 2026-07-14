import { z } from 'zod/v4';
import type { ZodType } from 'zod/v4';

export type FieldInputType = 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'json' | 'array-strings' | 'array-objects' | 'nested-object';

export interface FieldDef {
  key:          string;
  required:     boolean;
  inputType:    FieldInputType;
  options?:     string[];
  defaultValue: unknown;
  itemFields?:  FieldDef[];
  subFields?:   FieldDef[];
}

type JSONSchemaProp = {
  type?:       string | string[];
  enum?:       unknown[];
  anyOf?:      JSONSchemaProp[];
  oneOf?:      JSONSchemaProp[];
  const?:      unknown;
  default?:    unknown;
  properties?: Record<string, JSONSchemaProp>;
  items?:      JSONSchemaProp;
  required?:   string[];
};

type JSONSchemaRoot = JSONSchemaProp & {
  required?: string[];
};

export function schemaToFields(schema: ZodType): FieldDef[] {
  let root: JSONSchemaRoot;
  try {
    root = z.toJSONSchema(schema) as JSONSchemaRoot;
  } catch {
    return [];
  }

  if (!root.properties) return [];

  const required = new Set(root.required ?? []);

  return Object.entries(root.properties).map(([key, prop]) => ({
    key,
    required:     required.has(key),
    defaultValue: prop.default ?? null,
    ...resolveInputType(prop),
  }));
}

function resolveInputType(prop: JSONSchemaProp): Pick<FieldDef, 'inputType' | 'options' | 'itemFields' | 'subFields'> {
  // Enum explícito
  if (prop.enum) {
    return { inputType: 'select', options: prop.enum.map(String) };
  }

  // z.union([z.literal(x), …]) → anyOf/oneOf con constantes → select
  const variants = prop.anyOf ?? prop.oneOf;
  if (variants && variants.every(v => 'const' in v)) {
    return { inputType: 'select', options: variants.map(v => String(v.const)) };
  }

  const types = Array.isArray(prop.type) ? prop.type : [prop.type];

  if (types.includes('boolean'))                             return { inputType: 'checkbox' };
  if (types.includes('number') || types.includes('integer')) return { inputType: 'number' };

  if (types.includes('object')) {
    if (prop.properties) {
      const objRequired = new Set(prop.required ?? []);
      const subFields = Object.entries(prop.properties).map(([k, p]) => ({
        key:          k,
        required:     objRequired.has(k),
        defaultValue: p.default ?? null,
        ...resolveInputType(p),
      }));
      return { inputType: 'nested-object', subFields };
    }
    return { inputType: 'json' };
  }

  if (types.includes('array')) {
    if (prop.items?.type === 'object' && prop.items?.properties) {
      const itemRequired = new Set((prop.items as JSONSchemaProp).required ?? []);
      const itemFields = Object.entries(prop.items.properties).map(([k, p]) => ({
        key:          k,
        required:     itemRequired.has(k),
        defaultValue: p.default ?? null,
        ...resolveInputType(p),
      }));
      return { inputType: 'array-objects', itemFields };
    }
    if (prop.items?.type === 'string') {
      return { inputType: 'array-strings' };
    }
    return { inputType: 'json' };
  }

  return { inputType: 'text' };
}
