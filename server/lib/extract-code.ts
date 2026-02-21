export function extractCode(text: string): string {
  const htmlMatch = text.match(/```(?:html|htm)\s*\n([\s\S]*?)\n```/);
  if (htmlMatch) return htmlMatch[1].trim();

  const reactMatch = text.match(/```(?:jsx|tsx|react)\s*\n([\s\S]*?)\n```/);
  if (reactMatch) return reactMatch[1].trim();

  const genericMatch = text.match(/```\s*\n([\s\S]*?)\n```/);
  if (genericMatch) return genericMatch[1].trim();

  const trimmed = text.trim();
  if (trimmed.match(/^<!doctype|^<html/i)) return trimmed;
  if (trimmed.match(/^(export\s+default|function\s+App|const\s+App)/)) return trimmed;

  return text;
}
