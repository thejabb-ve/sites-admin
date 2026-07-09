import { z } from 'zod/v4';

export const GalleryPropsSchema = z.object({
  heading: z.string().optional(),
  images:  z.array(z.object({
    src:     z.string(),
    alt:     z.string(),
    caption: z.string().optional(),
  })).min(1),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
});

export type GalleryProps = z.infer<typeof GalleryPropsSchema>;
