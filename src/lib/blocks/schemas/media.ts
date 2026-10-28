import { z } from 'zod/v4';
import { GridColumnsSchema, OptionalHeadingSchema } from '../shared/schemas';

export const GalleryPropsSchema = z.object({
  heading: OptionalHeadingSchema,
  images:  z.array(z.object({
    src:     z.string(),
    alt:     z.string(),
    caption: z.string().optional(),
  })).min(1),
  columns: GridColumnsSchema,
});

export type GalleryProps = z.infer<typeof GalleryPropsSchema>;

// ─── ArticleGrid ──────────────────────────────────────────────────────────────

export const ArticleGridPropsSchema = z.object({
  heading:  OptionalHeadingSchema,
  articles: z.array(z.object({
    title:   z.string(),
    content: z.string(),
    href:    z.string(),
    img:     z.string(),
    date:    z.string().optional(),
    author: z.object({
      name: z.string(),
      img:  z.string().optional(),
      alt:  z.string().optional(),
    }).optional(),
  })).min(1),
});

export type ArticleGridProps = z.infer<typeof ArticleGridPropsSchema>;
