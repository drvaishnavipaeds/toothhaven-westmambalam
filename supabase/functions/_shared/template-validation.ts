export interface TemplateInput { name: string; language: string; category: string; body: string; examples: string[] }
export function templateVariables(body: string): number[] {
  return [...new Set([...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map(m => Number(m[1])))].sort((a, b) => a - b);
}
export function validateTemplate(input: TemplateInput): string | null {
  if (!/^[a-z][a-z0-9_]{0,511}$/.test(input.name)) return "Use lowercase letters, numbers and underscores for the template name.";
  if (!["en", "en_US", "en_GB", "ta"].includes(input.language)) return "Select English or Tamil.";
  if (!["UTILITY", "MARKETING"].includes(input.category)) return "Choose Utility or Marketing. Verification-code templates are read-only.";
  if (!input.body.trim() || input.body.length > 1024) return "Message must contain 1–1,024 characters.";
  const variables = templateVariables(input.body);
  const leftovers = input.body.replace(/\{\{\s*\d+\s*\}\}/g, "");
  if (leftovers.includes("{{") || leftovers.includes("}}")) return "Use numbered variables such as {{1}} and {{2}}.";
  if (variables.some((v, i) => v !== i + 1)) return "Variables must start at {{1}} and be consecutive.";
  if (variables.length !== input.examples.length || input.examples.some(e => !e.trim() || e.length > 200)) return "Provide one sample value (up to 200 characters) for every variable.";
  return null;
}
export function sameTemplateVariables(before: string, after: string): boolean {
  return JSON.stringify(templateVariables(before)) === JSON.stringify(templateVariables(after));
}
export function mayEditTemplate(template: { category?: string; status: string; components?: unknown[] }): boolean {
  if (template.category === "AUTHENTICATION" || !["APPROVED", "REJECTED", "PAUSED"].includes(template.status)) return false;
  const body = template.components?.find(c => typeof c === "object" && c !== null && "type" in c && c.type === "BODY") as { text?: string } | undefined;
  return !!body?.text && !/\{\{\s*[a-zA-Z_]/.test(body.text);
}