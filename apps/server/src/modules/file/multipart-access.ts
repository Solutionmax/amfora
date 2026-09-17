export function isOwnedMultipartObject(userId: string, objectName: string): boolean {
  if (!userId || !objectName || !objectName.startsWith(`${userId}/`)) return false;

  // Object keys are not filesystem paths, but reject traversal components so
  // callers cannot turn the owner prefix into an ambiguous path-like key.
  const pathParts = objectName.split("/");
  return pathParts.slice(1).every((part) => part !== "" && part !== "." && part !== "..");
}
