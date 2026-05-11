import { z } from 'zod';
import { DesignSpecSchema } from '../types/spec';
import { DesignSystemMarkdownSourceSchema } from '../types/design-system-source';
import { ThinkingOverrideSchema } from '../lib/thinking-defaults';
import { HypothesisStrategySchema } from './hypothesis-request-schemas';

export const DesignSystemExtractRequestSchema = z
  .object({
    title: z.string().optional(),
    content: z.string().optional(),
    sourceHash: z.string().optional(),
    images: z
      .array(
        z.object({
          dataUrl: z.string(),
          mimeType: z.string().optional(),
          name: z.string().optional(),
          filename: z.string().optional(),
          description: z.string().optional(),
        }).passthrough(),
      )
      .optional(),
    markdownSources: z.array(DesignSystemMarkdownSourceSchema).optional(),
    providerId: z.string().min(1),
    modelId: z.string().min(1),
    thinking: ThinkingOverrideSchema.optional(),
  })
  .refine((body) => (
    Boolean(body.content?.trim()) ||
    Boolean(body.images?.length) ||
    Boolean(body.markdownSources?.some((source) => source.content.trim()))
  ), {
    message: 'Provide design-system text, Markdown sources, design-system reference images, or a combination.',
  });

export const InputsGenerateTargetSchema = z.enum([
  'research-context',
  'objectives-metrics',
  'design-constraints',
]);

export const InputsGenerateRequestSchema = z.object({
  inputId: InputsGenerateTargetSchema,
  designBrief: z.string().min(1),
  researchContext: z.string().optional(),
  objectivesMetrics: z.string().optional(),
  designConstraints: z.string().optional(),
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  thinking: ThinkingOverrideSchema.optional(),
});

const IncubatorPromptOptionsSchema = z.object({
  count: z.number().int().positive().optional(),
  existingStrategies: z.array(HypothesisStrategySchema).optional(),
  /**
   * When true, the incubate route runs a brainstorm + curation prelude
   * before the main incubator call. The curated 5 product-shape candidates
   * are stitched into the design brief as a `<product_shape_candidates>`
   * block so every downstream stage sees them. Promoted from the
   * experiments tool's "ideation" flow after a 384-cell matrix showed
   * ~15% more distinct themes vs canonical at +50% wall-time cost.
   */
  brainstormFirst: z.boolean().optional(),
});

export const IncubateRequestSchema = z.object({
  spec: DesignSpecSchema,
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  referenceDesigns: z
    .array(
      z.object({
        name: z.string(),
        code: z.string(),
      }),
    )
    .optional(),
  supportsVision: z.boolean().optional(),
  promptOptions: IncubatorPromptOptionsSchema.optional(),
  thinking: ThinkingOverrideSchema.optional(),
});

export type DesignSystemExtractRequestWire = z.infer<typeof DesignSystemExtractRequestSchema>;
export type IncubateRequestWire = z.infer<typeof IncubateRequestSchema>;
export type InputsGenerateRequestWire = z.infer<typeof InputsGenerateRequestSchema>;
