import { VirtualWorkspace } from './workspace';
import { AgentToolError } from '../../lib/error-utils';
import type { GenerationProvider } from '../../types/provider';
import type { ProviderOptions } from '../../types/provider';
import type { ChatMessage } from '../compiler';

// ── Build plan types ─────────────────────────────────────────────────

interface BuildPlanFile {
  path: string;
  responsibility: string;
  key_decisions: string[];
}

interface BuildPlan {
  intent: string;
  palette: Record<string, string>;
  typography: Record<string, string>;
  layout: string;
  files: BuildPlanFile[];
}

/** Run a single-shot planning request and parse the JSON build plan. */
async function runPlanningPass(
  plannerSystemPrompt: string,
  userPromptContext: string,
  provider: GenerationProvider,
  providerOptions: ProviderOptions,
  onProgress?: (status: string) => void
): Promise<BuildPlan | null> {
  onProgress?.('Planning build...');
  const messages: ChatMessage[] = [
    { role: 'system', content: plannerSystemPrompt },
    { role: 'user', content: userPromptContext },
  ];
  const response = await provider.generateChat(messages, providerOptions);
  try {
    const plan = JSON.parse(response.raw) as BuildPlan;
    onProgress?.(`Plan ready: ${plan.files.length} files — ${plan.intent}`);
    return plan;
  } catch {
    onProgress?.('Warning: Could not parse build plan. Proceeding without plan.');
    return null;
  }
}

/** Format a build plan into a concise context block the builder can reference. */
function formatPlanContext(plan: BuildPlan): string {
  const files = plan.files
    .map((f, i) => `  ${i + 1}. ${f.path} — ${f.responsibility}`)
    .join('\n');
  const paletteEntries = Object.entries(plan.palette)
    .filter(([k]) => k !== 'rationale')
    .map(([k, v]) => `    ${k}: ${v}`)
    .join('\n');
  const typographyEntries = Object.entries(plan.typography)
    .filter(([k]) => k !== 'rationale')
    .map(([k, v]) => `    ${k}: ${v}`)
    .join('\n');

  return `<build_plan>
<intent>${plan.intent}</intent>
<palette>
${paletteEntries}
</palette>
<typography>
${typographyEntries}
</typography>
<layout>${plan.layout}</layout>
<files>
${files}
</files>
<instruction>Write each file from the list above, in order, one per response. After writing the last file, call finish_build.</instruction>
</build_plan>`;
}

/**
 * A simple regex-based XML parser to extract tool calls from the LLM's response.
 * Looks for <write_file path="..."></write_file> and <finish_build></finish_build>.
 */
function extractToolCalls(response: string) {
  const toolCalls: { name: string; args: any }[] = [];

  // Parse <write_file path="...">content</write_file>
  // We use [\s\S]*? to match across newlines non-greedily
  const writeRegex = /<write_file\s+path=["']([^"']+)["']>([\s\S]*?)<\/write_file>/g;
  let match;
  while ((match = writeRegex.exec(response)) !== null) {
    toolCalls.push({
      name: 'write_file',
      args: { path: match[1], content: match[2].trim() },
    });
  }

  // Parse <edit_file path="...">...</edit_file>
  // Assuming a format: <edit_file path="..."><search>...</search><replace>...</replace></edit_file>
  const editRegex = /<edit_file\s+path=["']([^"']+)["']>([\s\S]*?)<\/edit_file>/g;
  while ((match = editRegex.exec(response)) !== null) {
    const editBody = match[2];
    const searchMatch = /<search>([\s\S]*?)<\/search>/.exec(editBody);
    const replaceMatch = /<replace>([\s\S]*?)<\/replace>/.exec(editBody);

    if (searchMatch && replaceMatch) {
      toolCalls.push({
        name: 'edit_file',
        args: {
          path: match[1],
          searchBlock: searchMatch[1],
          replaceBlock: replaceMatch[1],
        },
      });
    }
  }

  // Parse <finish_build></finish_build> or <finish_build/>
  const finishRegex = /<finish_build\s*\/?>(?:<\/finish_build>)?/g;
  if (finishRegex.test(response)) {
    toolCalls.push({ name: 'finish_build', args: {} });
  }

  return toolCalls;
}

export interface AgenticBuildOptions {
  model: string;
  supportsVision?: boolean;
  maxLoops?: number;
  plannerSystemPrompt?: string;
  onProgress?: (status: string) => void;
}

export async function runAgenticBuild(
  builderSystemPrompt: string,
  userPromptContext: string,
  provider: GenerationProvider,
  options: AgenticBuildOptions
): Promise<VirtualWorkspace> {
  const workspace = new VirtualWorkspace();
  const maxLoops = options.maxLoops ?? 15;
  let loops = 0;
  let isFinished = false;

  const providerOptions: ProviderOptions = {
    model: options.model,
    supportsVision: options.supportsVision,
  };

  // ── Planning pass ────────────────────────────────────────────────
  let buildPlanContext = '';
  if (options.plannerSystemPrompt) {
    const plan = await runPlanningPass(
      options.plannerSystemPrompt,
      userPromptContext,
      provider,
      providerOptions,
      options.onProgress
    );
    if (plan) {
      buildPlanContext = '\n\n' + formatPlanContext(plan);
    }
  }

  // ── Build loop ───────────────────────────────────────────────────
  const messages: ChatMessage[] = [
    { role: 'system', content: builderSystemPrompt },
    { role: 'user', content: userPromptContext + buildPlanContext },
  ];

  options.onProgress?.('Starting build...');

  while (!isFinished && loops < maxLoops) {
    options.onProgress?.(`Build loop ${loops + 1}/${maxLoops}...`);

    const response = await provider.generateChat(messages, providerOptions);

    // Add LLM's response to the event stream
    messages.push({ role: 'assistant', content: response.raw });

    // Extract tools called in this response
    const toolCalls = extractToolCalls(response.raw);

    if (toolCalls.length === 0) {
      // If the LLM didn't call any tools, gently nudge it back on track
      messages.push({
        role: 'user',
        content: `Warning: You did not output any valid XML tool calls (e.g. <write_file>). 
Please use the tools to write files or call <finish_build> if you are done. Do not output raw HTML outside of a tool call.`,
      });
    } else {
      // Execute the requested tools
      let feedback = '';

      for (const call of toolCalls) {
        options.onProgress?.(`Executing tool: ${call.name}...`);

        try {
          if (call.name === 'write_file') {
            workspace.writeFile(call.args.path, call.args.content);
            feedback += `Tool \`write_file\` executed successfully for path: ${call.args.path}\n`;
          } else if (call.name === 'edit_file') {
            const success = workspace.patchFile(call.args.path, call.args.searchBlock, call.args.replaceBlock);
            if (success) {
              feedback += `Tool \`edit_file\` executed successfully for path: ${call.args.path}\n`;
            } else {
              throw new AgentToolError(`The <search> block was not found exactly as written in ${call.args.path}.`, 'edit_file');
            }
          } else if (call.name === 'finish_build') {
            isFinished = true;
            feedback += `Build finished.\n`;
            options.onProgress?.('Build complete. Assembling iframe...');
            break; // Stop executing tools if finish_build is called
          }
        } catch (error) {
          if (error instanceof AgentToolError) {
            feedback += `Tool \`${error.toolName}\` FAILED: ${error.message}\n`;
          } else {
            feedback += `Tool \`${call.name}\` FAILED with an unexpected error: ${String(error)}\n`;
          }
        }
      }

      // Provide feedback back to the LLM if we are not finished
      if (!isFinished && feedback) {
        messages.push({
          role: 'user',
          content: feedback + '\nContinue building. Read your errors and correct them if needed.',
        });
      }
    }

    loops++;
  }

  if (!isFinished) {
    options.onProgress?.(`Warning: Build reached max loops (${maxLoops}) and was forcefully stopped.`);
  }

  return workspace;
}
