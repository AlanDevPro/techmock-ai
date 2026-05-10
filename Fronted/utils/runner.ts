export function getExecutionType(language: string) {
  if (["html", "react"].includes(language)) {
    return "browser";
  }
  return "backend";
}