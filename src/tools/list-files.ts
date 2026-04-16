import { readdir, stat } from "fs/promises";
import { join } from "path";
import { DEFAULT_DESTINATION, DESTINATION_NAMES, MANAGED_DESTINATIONS } from "../config.js";
import { normalizeDestinationName, toFileUri } from "../utils.js";

export const listFilesToolDefinition = {
  name: "list_generated_files",
  description:
    "Lists files in the managed output destinations with their names, sizes, dates, saved local paths, and file:// URIs.",
  inputSchema: {
    type: "object" as const,
    properties: {
      destination: {
        type: "string",
        description:
          `Optional destination filter. Available destinations: ${DESTINATION_NAMES.join(", ")}. ` +
          `Defaults to listing all destinations.`,
      },
    },
    required: [],
  },
};

async function collectFiles(
  rootDir: string,
  relativePrefix = ""
): Promise<Array<{ relativePath: string; absolutePath: string }>> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files: Array<{ relativePath: string; absolutePath: string }> = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const relativePath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
    const absolutePath = join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath, relativePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push({ relativePath, absolutePath });
    }
  }

  return files;
}

export async function handleListFiles(args?: { destination?: string }) {
  const destinations = args?.destination
    ? [normalizeDestinationName(args.destination)]
    : DESTINATION_NAMES;

  const sections: string[] = [];
  let totalFiles = 0;

  for (const destination of destinations) {
    const rootDir = MANAGED_DESTINATIONS[destination];
    let files: Array<{ relativePath: string; absolutePath: string }> = [];

    try {
      files = await collectFiles(rootDir);
    } catch {
      continue;
    }

    if (files.length === 0) {
      continue;
    }

    const fileInfos: string[] = [];
    for (const file of files) {
      try {
        const fileStat = await stat(file.absolutePath);
        if (!fileStat.isFile()) continue;

        const sizeKB = (fileStat.size / 1024).toFixed(1);
        const created = fileStat.birthtime.toISOString().split("T")[0];
        fileInfos.push(
          `- \`${file.relativePath}\` (${sizeKB} KB, ${created}) — ${file.absolutePath} — ${toFileUri(file.absolutePath)}`
        );
        totalFiles++;
      } catch {
        // Skip files we can't stat
      }
    }

    if (fileInfos.length > 0) {
      sections.push(`Destination: ${destination}\n${fileInfos.join("\n")}`);
    }
  }

  if (sections.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text:
            "No generated files found in the managed destinations. " +
            `Default destination is ${DEFAULT_DESTINATION}.`,
        },
      ],
    };
  }

  const scopeText = args?.destination
    ? `in destination ${normalizeDestinationName(args.destination)}`
    : "across all managed destinations";

  return {
    content: [
      {
        type: "text" as const,
        text: `Found ${totalFiles} file(s) ${scopeText}.\n\n${sections.join("\n\n")}`,
      },
    ],
  };
}
