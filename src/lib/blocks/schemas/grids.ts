import { z } from 'zod/v4';

export const FeatureGridPropsSchema = z.object({
  heading:    z.string().optional(),
  subheading: z.string().optional(),
  features:   z.array(z.object({
    icon:        z.string().optional(),
    title:       z.string(),
    description: z.string(),
  })).min(1),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
});

export type FeatureGridProps = z.infer<typeof FeatureGridPropsSchema>;
