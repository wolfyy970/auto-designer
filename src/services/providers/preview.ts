import type { CompiledPrompt } from '../../types/compiler';
import type { GenerationProvider, GenerationResult, OutputFormat, ProviderOptions } from '../../types/provider';
import { generateId, now } from '../../lib/utils';

export class PreviewProvider implements GenerationProvider {
  id = 'preview';
  name = 'Preview (Prompt Text)';
  description = 'Shows the compiled prompt as text. No generation.';
  supportsImages = false;
  supportedFormats: OutputFormat[] = ['html', 'react'];

  async generate(
    prompt: CompiledPrompt,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: ProviderOptions
  ): Promise<GenerationResult> {
    return {
      id: generateId(),
      variantStrategyId: prompt.variantStrategyId,
      providerId: this.id,
      status: 'complete',
      code: prompt.prompt,
      metadata: {
        model: 'none (preview)',
        tokensUsed: 0,
        durationMs: 0,
        completedAt: now(),
      },
    };
  }

  isAvailable(): boolean {
    return true;
  }
}
