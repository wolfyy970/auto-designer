import { Hono } from 'hono';
import type { DesignSpec } from '../../src/types/spec.ts';
import type { VariantStrategy } from '../../src/types/compiler.ts';
import { compileSpec } from '../services/compiler.ts';
import { resolvePrompt } from '../lib/prompts/defaults.ts';
import type { CritiqueInput } from '../lib/prompts/compiler-user.ts';

const compile = new Hono();

interface CompileRequest {
  spec: DesignSpec;
  providerId: string;
  modelId: string;
  promptOverrides?: {
    compilerSystem?: string;
    compilerUser?: string;
  };
  referenceDesigns?: { name: string; code: string }[];
  critiques?: CritiqueInput[];
  supportsVision?: boolean;
  promptOptions?: {
    count?: number;
    existingStrategies?: VariantStrategy[];
  };
}

compile.post('/', async (c) => {
  const body = await c.req.json<CompileRequest>();

  const systemPrompt = resolvePrompt('compilerSystem', body.promptOverrides ? { compilerSystem: body.promptOverrides.compilerSystem } : undefined);
  const userPromptTemplate = resolvePrompt('compilerUser', body.promptOverrides ? { compilerUser: body.promptOverrides.compilerUser } : undefined);

  const result = await compileSpec(body.spec, body.modelId, body.providerId, {
    systemPrompt,
    userPromptTemplate,
    referenceDesigns: body.referenceDesigns,
    critiques: body.critiques,
    supportsVision: body.supportsVision,
    promptOptions: body.promptOptions,
  });

  return c.json(result);
});

export default compile;
