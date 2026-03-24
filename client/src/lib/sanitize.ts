const TAGS_ALLOWED = new Set(["b", "i", "em", "strong", "a", "br", "p", "span", "ul", "ol", "li", "code", "pre"]);
const ATTRS_ALLOWED = new Set(["href", "target", "rel", "class", "style"]);

export function sanitize(html: string): string {
  if (!html) return "";
  // Simple but effective sanitizer - strips all tags except allowed
  return html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    if (TAGS_ALLOWED.has(tag.toLowerCase())) {
      // Strip dangerous attributes
      return match.replace(/\s+(\w+)="[^"]*"/g, (attr, name) => {
        if (ATTRS_ALLOWED.has(name.toLowerCase())) return attr;
        return "";
      }).replace(/\s+on\w+="[^"]*"/gi, ""); // Remove event handlers
    }
    return ""; // Strip unknown tags
  });
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
