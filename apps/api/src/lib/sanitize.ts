import { FilterXSS } from "xss";

const xssFilter = new FilterXSS({
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
});

export function sanitizeText(input: string): string {
  return xssFilter.process(input);
}

export function sanitizeMetadata(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "string" ? sanitizeText(item) : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
