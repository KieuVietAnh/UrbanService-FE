// Shared utilities
export function getAttachmentUrl(att) {
  if (!att) return null;
  if (typeof att === 'string') return att;
  return att.url || att.path || null;
}
