/**
 * Shared code extraction from LLM responses.
 * Used by both OpenRouter and LM Studio generation providers.
 */

export function extractCode(text: string): string {
  // Try to extract from markdown code fences
  const htmlMatch = text.match(/```(?:html|htm)\s*\n([\s\S]*?)\n```/);
  if (htmlMatch) return htmlMatch[1].trim();

  const reactMatch = text.match(/```(?:jsx|tsx|react)\s*\n([\s\S]*?)\n```/);
  if (reactMatch) return reactMatch[1].trim();

  const genericMatch = text.match(/```\s*\n([\s\S]*?)\n```/);
  if (genericMatch) return genericMatch[1].trim();

  // Check if response is already raw HTML/code (no fence)
  const trimmed = text.trim();
  if (trimmed.match(/^<!doctype|^<html/i)) return trimmed;

  // Check if it starts with common React patterns
  if (trimmed.match(/^(export\s+default|function\s+App|const\s+App)/)) return trimmed;

  return text;
}
