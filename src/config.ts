import { homedir } from "os";
import { join } from "path";

function getEnvPath(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

export const MANAGED_DESTINATIONS: Record<string, string> = {
  downloads: getEnvPath("MCP_DOWNLOADS_DIR", join(homedir(), "Downloads", "mcp-utility-hub")),
  desktop: getEnvPath("MCP_DESKTOP_DIR", join(homedir(), "Desktop", "mcp-utility-hub")),
  documents: getEnvPath("MCP_DOCUMENTS_DIR", join(homedir(), "Documents", "mcp-utility-hub")),
};

const legacyExportDir = process.env.MCP_EXPORT_DIR?.trim();
if (legacyExportDir) {
  MANAGED_DESTINATIONS.export = legacyExportDir;
}

export const DESTINATION_NAMES = Object.keys(MANAGED_DESTINATIONS);

const requestedDefaultDestination = (process.env.MCP_DEFAULT_DESTINATION || "downloads")
  .trim()
  .toLowerCase();

export const DEFAULT_DESTINATION = DESTINATION_NAMES.includes(requestedDefaultDestination)
  ? requestedDefaultDestination
  : "downloads";

export const DEFAULT_SUBDIRECTORY = process.env.MCP_DEFAULT_SUBDIRECTORY?.trim() || "";

const requestedForcedDestination = process.env.MCP_FORCE_DESTINATION?.trim().toLowerCase() || "";
export const FORCED_DESTINATION = DESTINATION_NAMES.includes(requestedForcedDestination)
  ? requestedForcedDestination
  : "";

export const FORCED_SUBDIRECTORY = process.env.MCP_FORCE_SUBDIRECTORY?.trim() || "";
