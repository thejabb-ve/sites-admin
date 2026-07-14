import { z } from 'zod/v4';

const HeroBaseSchema = z.object({
  heading:    z.string(),
  subheading: z.string().optional(),
  ctaLabel:   z.string().optional(),
  ctaHref:    z.string().optional(),
});

export const HeroCenteredPropsSchema = HeroBaseSchema.extend({
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
});

export const HeroSplitPropsSchema = HeroBaseSchema.extend({
  imageUrl: z.string(),
  imageAlt: z.string().optional(),
  text:     z.string().optional(),
  reversed: z.boolean().default(false),
});

export type HeroCenteredProps = z.infer<typeof HeroCenteredPropsSchema>;
export type HeroSplitProps    = z.infer<typeof HeroSplitPropsSchema>;
