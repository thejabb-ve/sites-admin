import { z } from 'zod/v4';

// Cantidad de columnas de grid — compartida por los bloques de tipo grid/gallery.
export const GridColumnsSchema = z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3);

// Heading opcional de sección — compartido por la mayoría de los bloques.
export const OptionalHeadingSchema = z.string().optional();

// Link simple {label, href} — compartido por navegación, countdown, etc.
export const LinkSchema = z.object({
  label: z.string(),
  href:  z.string(),
});

export const BlockLayoutSchema = z.object({
  container:  z.enum(['full', 'contained', 'narrow']).default('contained'),
  padding:    z.enum(['none', 'sm', 'md', 'lg']).default('md'),
  background: z.enum(['default', 'surface', 'primary', 'accent']).default('default'),
});

export const BlockVisibilitySchema = z.object({
  mobile:  z.boolean().default(true),
  tablet:  z.boolean().default(true),
  desktop: z.boolean().default(true),
});
