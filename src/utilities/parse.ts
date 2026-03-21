export function safeParse(json: string): string {
  try {
    return JSON.parse(json);
  } catch {
    throw new Error("INVALID_JSON_FROM_AGENT");
  };
};