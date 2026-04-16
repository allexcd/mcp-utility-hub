import { resolve } from "path";
import { pathToFileURL } from "url";
import {
  DEFAULT_DESTINATION,
  DESTINATION_NAMES,
  MANAGED_DESTINATIONS,
} from "./config.js";

function sanitizePathSegment(segment: string): string {
  let safe = segment.replace(/[^\w.\-]/g, "_");

  if (safe.startsWith(".")) {
    safe = "_" + safe.slice(1);
  }

  if (!safe || safe === "." || safe === "..") {
    throw new Error("Invalid path segment");
  }

  return safe;
}

export function normalizeDestinationName(destination?: string): string {
  const normalized = destination?.trim().toLowerCase() || DEFAULT_DESTINATION;
  if (!MANAGED_DESTINATIONS[normalized]) {
    throw new Error(
      `Unknown destination: ${destination}. Available destinations: ${DESTINATION_NAMES.join(", ")}`
    );
  }

  return normalized;
}

/**
 * Sanitize a user-provided filename to prevent path traversal and unsafe characters.
 * Returns the sanitized filename or throws if the result is empty.
 */
export function sanitizeFilename(filename: string): string {
  const segments = filename.split(/[\\/]+/).filter(Boolean);
  const finalSegment = segments.at(-1) ?? filename;
  return sanitizePathSegment(finalSegment);
}

export function sanitizeRelativePath(relativePath: string): string {
  const segments = relativePath.split(/[\\/]+/).filter(Boolean);
  const safeSegments: string[] = [];

  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }
    if (segment === "..") {
      throw new Error("Invalid relative path");
    }
    safeSegments.push(sanitizePathSegment(segment));
  }

  if (safeSegments.length === 0) {
    throw new Error("Invalid relative path");
  }

  return safeSegments.join("/");
}

export function buildRelativePath(filename: string, subdirectory?: string): string {
  const safeFilename = sanitizeFilename(filename);
  if (!subdirectory?.trim()) {
    return safeFilename;
  }

  return `${sanitizeRelativePath(subdirectory)}/${safeFilename}`;
}

/**
 * Resolve a path within a managed destination and verify it doesn't escape.
 * Returns the absolute path or throws if path traversal is detected.
 */
export function resolveManagedPath(destination: string | undefined, relativePath: string): {
  destination: string;
  root: string;
  safeRelativePath: string;
  absolutePath: string;
} {
  const normalizedDestination = normalizeDestinationName(destination);
  const safeRelativePath = sanitizeRelativePath(relativePath);
  const root = resolve(MANAGED_DESTINATIONS[normalizedDestination]);
  const absolutePath = resolve(root, safeRelativePath);

  if (!absolutePath.startsWith(root + "/")) {
    throw new Error("Path traversal detected");
  }

  return {
    destination: normalizedDestination,
    root,
    safeRelativePath,
    absolutePath,
  };
}

export function toFileUri(absolutePath: string): string {
  return pathToFileURL(absolutePath).href;
}
