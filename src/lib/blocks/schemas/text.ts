import { z } from 'zod/v4';

export const RichTextPropsSchema = z.object({
  content: z.string(),
});

export type RichTextProps = z.infer<typeof RichTextPropsSchema>;

export const RichTextColumnsPropsSchema = z.object({
  contentLeft:  z.string(),
  contentRight: z.string(),
});

export type RichTextColumnsProps = z.infer<typeof RichTextColumnsPropsSchema>;
