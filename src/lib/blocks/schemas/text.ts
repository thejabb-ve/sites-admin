import { z } from 'zod/v4';

export const RichTextPropsSchema = z.object({
  content: z.string(),
});
