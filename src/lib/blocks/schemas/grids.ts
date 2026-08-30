import { z } from 'zod/v4';
import { GridColumnsSchema, OptionalHeadingSchema } from '../shared/schemas';

export const FeatureGridPropsSchema = z.object({
  heading:    OptionalHeadingSchema,
  subheading: z.string().optional(),
  features:   z.array(z.object({
    icon:        z.string().optional(),
    title:       z.string(),
    description: z.string(),
  })).min(1),
  columns: GridColumnsSchema,
});

// ─── CollectionGrid ───────────────────────────────────────────────────────────

const CollectionItemSchema = z.object({
  id:        z.string(),
  title:     z.string(),
  full_path: z.string(),
  fields:    z.record(z.string(), z.unknown()),
});

export const CollectionGridPropsSchema = z.object({
  heading:        OptionalHeadingSchema,
  collectionSlug: z.string(),
  imageField:     z.string().default('img'),
  columns:        GridColumnsSchema,
  items:          z.array(CollectionItemSchema).default([]),
});

// ─── Cluster ──────────────────────────────────────────────────────────────────

export const ClusterPropsSchema = z.object({
  heading: OptionalHeadingSchema,
  text:    z.string().optional(),
  data:    z.array(z.object({
    name:   z.string(),
    img:    z.string(),
    alt:    z.string().optional(),
    href:   z.string(),
    target: z.enum(['_blank', '_self']).optional(),
    rel:    z.string().optional(),
  })).min(1),
  limit: z.number().int().min(1).default(9),
  more:  z.boolean().default(false),
});
