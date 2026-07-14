import { z } from 'zod/v4';

export const RichTextPropsSchema = z.object({
  content: z.string(),
});

export type RichTextProps = z.infer<typeof RichTextPropsSchema>;
