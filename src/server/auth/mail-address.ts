/** Splits `"Name <email@domain>"` (or a bare address) into the `{ name, email }` shape Brevo expects. */
export function parseSender(value: string): { name?: string; email: string } {
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/);
  if (match) return match[1] ? { name: match[1], email: match[2] } : { email: match[2] };
  return { email: value.trim() };
}
