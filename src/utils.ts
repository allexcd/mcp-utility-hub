import { basename, resolve } from "path";
import { EXPORT_DIR } from "./config.js";

/**
 * Sanitize a user-provided filename to prevent path traversal and unsafe characters.
 * Returns the sanitized filename or throws if the result is empty.
 */
export function sanitizeFilename(filename: string): string {
  // Extract just the filename component (strips any directory parts)
  let safe = basename(filename);

  // Replace any characters that aren't alphanumeric, dots, hyphens, or underscores
  safe = safe.replace(/[^\w.\-]/g, "_");

  // Reject hidden files (starting with dot)
  if (safe.startsWith(".")) {
    safe = "_" + safe.slice(1);
  }

  // Reject empty result
  if (!safe || safe === "." || safe === "..") {
    throw new Error("Invalid filename");
  }

  return safe;
}

/**
 * Resolve a filename within the export directory and verify it doesn't escape.
 * Returns the absolute path or throws if path traversal is detected.
 */
export function resolveExportPath(filename: string): string {
  const safeName = sanitizeFilename(filename);
  const resolved = resolve(EXPORT_DIR, safeName);
  const exportRoot = resolve(EXPORT_DIR);

  if (!resolved.startsWith(exportRoot + "/") && resolved !== exportRoot) {
    throw new Error("Path traversal detected");
  }

  return resolved;
}
