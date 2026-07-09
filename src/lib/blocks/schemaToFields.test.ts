import { describe, it, expect } from 'bun:test';
import { z } from 'zod/v4';
import { schemaToFields } from './schemaToFields';
import { HeroCenteredPropsSchema } from './schemas/heros';
import { CtaPropsSchema }          from './schemas/ctas';
import { RichTextPropsSchema }     from './schemas/text';
import { GalleryPropsSchema }      from './schemas/media';
import { FeatureGridPropsSchema }  from './schemas/grids';

// ─────────────────────────────────────────
// Tipos de input inferidos desde JSON Schema
// ─────────────────────────────────────────

describe('schemaToFields — tipos básicos', () => {
  it('retorna [] para un schema que no es ZodObject', () => {
    expect(schemaToFields(z.string())).toEqual([]);
    expect(schemaToFields(z.array(z.string()))).toEqual([]);
  });

  it('z.string() → inputType text', () => {
    const [field] = schemaToFields(z.object({ title: z.string() }));
    expect(field?.inputType).toBe('text');
  });

  it('z.boolean() → inputType checkbox', () => {
    const [field] = schemaToFields(z.object({ active: z.boolean() }));
    expect(field?.inputType).toBe('checkbox');
  });

  it('z.number() → inputType number', () => {
    const [field] = schemaToFields(z.object({ count: z.number() }));
    expect(field?.inputType).toBe('number');
  });

  it('z.enum() → inputType select con opciones correctas', () => {
    const [field] = schemaToFields(
      z.object({ variant: z.enum(['primary', 'secondary', 'ghost']) }),
    );
    expect(field?.inputType).toBe('select');
    expect(field?.options).toEqual(['primary', 'secondary', 'ghost']);
  });

  it('z.array(z.string()) → inputType array-strings', () => {
    const [field] = schemaToFields(z.object({ items: z.array(z.string()) }));
    expect(field?.inputType).toBe('array-strings');
  });

  it('z.object() anidado → inputType nested-object', () => {
    const [field] = schemaToFields(z.object({ meta: z.object({ x: z.string() }) }));
    expect(field?.inputType).toBe('nested-object');
  });

  it('nested-object expone subFields con keys y tipos correctos', () => {
    const [field] = schemaToFields(
      z.object({
        phase: z.object({ title: z.string(), count: z.number() }),
      }),
    );
    expect(field?.inputType).toBe('nested-object');
    expect(field?.subFields?.find(f => f.key === 'title')?.inputType).toBe('text');
    expect(field?.subFields?.find(f => f.key === 'count')?.inputType).toBe('number');
  });
});

// ─────────────────────────────────────────
// Campo required vs optional
// ─────────────────────────────────────────

describe('schemaToFields — required / optional', () => {
  it('campo sin .optional() → required: true', () => {
    const [field] = schemaToFields(z.object({ name: z.string() }));
    expect(field?.required).toBe(true);
  });

  it('campo con .optional() → required: false', () => {
    const [field] = schemaToFields(z.object({ sub: z.string().optional() }));
    expect(field?.required).toBe(false);
  });

  it('mezcla de requeridos y opcionales', () => {
    const schema = z.object({
      req: z.string(),
      opt: z.string().optional(),
    });
    const fields = schemaToFields(schema);
    expect(fields.find(f => f.key === 'req')?.required).toBe(true);
    expect(fields.find(f => f.key === 'opt')?.required).toBe(false);
  });
});

// ─────────────────────────────────────────
// Valor por defecto
// ─────────────────────────────────────────

describe('schemaToFields — defaultValue', () => {
  it('z.number().default(3) → defaultValue: 3', () => {
    const [field] = schemaToFields(z.object({ cols: z.number().default(3) }));
    expect(field?.defaultValue).toBe(3);
  });

  it('z.boolean().default(false) → defaultValue: false', () => {
    const [field] = schemaToFields(z.object({ reversed: z.boolean().default(false) }));
    expect(field?.defaultValue).toBe(false);
  });

  it('campo sin default → defaultValue: null', () => {
    const [field] = schemaToFields(z.object({ name: z.string() }));
    expect(field?.defaultValue).toBeNull();
  });
});

// ─────────────────────────────────────────
// Schemas reales de la superplantilla
// ─────────────────────────────────────────

describe('schemaToFields — schemas reales', () => {
  it('HeroCenteredPropsSchema: heading requerido, imageUrl opcional', () => {
    const fields = schemaToFields(HeroCenteredPropsSchema);
    expect(fields.find(f => f.key === 'heading')?.required).toBe(true);
    expect(fields.find(f => f.key === 'imageUrl')?.required).toBe(false);
  });

  it('CtaPropsSchema: 3 campos — label:text, href:text, variant:select', () => {
    const fields = schemaToFields(CtaPropsSchema);
    expect(fields).toHaveLength(3);
    expect(fields.find(f => f.key === 'label')?.inputType).toBe('text');
    expect(fields.find(f => f.key === 'href')?.inputType).toBe('text');
    const variant = fields.find(f => f.key === 'variant');
    expect(variant?.inputType).toBe('select');
    expect(variant?.options).toEqual(['primary', 'secondary', 'ghost']);
  });

  it('RichTextPropsSchema: único campo content es string requerido', () => {
    const fields = schemaToFields(RichTextPropsSchema);
    expect(fields).toHaveLength(1);
    expect(fields[0]?.key).toBe('content');
    expect(fields[0]?.inputType).toBe('text');
    expect(fields[0]?.required).toBe(true);
  });

  it('GalleryPropsSchema: images → array-objects, columns → select [2,3,4] con default 3', () => {
    const fields = schemaToFields(GalleryPropsSchema);
    expect(fields.find(f => f.key === 'images')?.inputType).toBe('array-objects');
    const cols = fields.find(f => f.key === 'columns');
    // z.union([z.literal(2), z.literal(3), z.literal(4)]) → select de literales
    expect(cols?.inputType).toBe('select');
    expect(cols?.options).toEqual(['2', '3', '4']);
    expect(cols?.defaultValue).toBe(3);
  });

  it('FeatureGridPropsSchema: features → array-objects, heading → text opcional', () => {
    const fields = schemaToFields(FeatureGridPropsSchema);
    expect(fields.find(f => f.key === 'features')?.inputType).toBe('array-objects');
    const heading = fields.find(f => f.key === 'heading');
    expect(heading?.inputType).toBe('text');
    expect(heading?.required).toBe(false);
  });
});

// ─────────────────────────────────────────
// fieldOverrides (aplicado desde el registry, no desde schemaToFields)
// ─────────────────────────────────────────

describe('schemaToFields — fieldOverrides manual', () => {
  it('override de text a textarea mantiene key, required y defaultValue', () => {
    const fields  = schemaToFields(RichTextPropsSchema);
    const overrides = { content: { inputType: 'textarea' as const } };
    const merged  = fields.map(f => overrides[f.key as keyof typeof overrides]
      ? { ...f, ...overrides[f.key as keyof typeof overrides] }
      : f,
    );
    expect(merged[0]?.inputType).toBe('textarea');
    expect(merged[0]?.key).toBe('content');
    expect(merged[0]?.required).toBe(true);
  });
});
