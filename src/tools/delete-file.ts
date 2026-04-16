import { dirname } from "path";
import { rmdir, unlink } from "fs/promises";
import { DEFAULT_DESTINATION, DESTINATION_NAMES } from "../config.js";
import { normalizeDestinationName, resolveManagedPath } from "../utils.js";

async function pruneEmptyDirectories(root: string, filePath: string): Promise<void> {
  let currentDir = dirname(filePath);

  while (currentDir.startsWith(root + "/")) {
    try {
      await rmdir(currentDir);
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOTEMPTY" || code === "ENOENT") {
        return;
      }
      throw err;
    }

    currentDir = dirname(currentDir);
  }
}

export const deleteFileToolDefinition = {
  name: "delete_generated_file",
  description: "Deletes a previously generated file from one of the managed destinations.",
  inputSchema: {
    type: "object" as const,
    properties: {
      destination: {
        type: "string",
        description:
          `Optional destination. Available destinations: ${DESTINATION_NAMES.join(", ")}. ` +
          `Defaults to ${DEFAULT_DESTINATION}.`,
      },
      path: {
        type: "string",
        description: "Relative path of the file to delete inside the destination (e.g., notes/report.md)",
      },
      filename: {
        type: "string",
        description: "Legacy alias for path when deleting a file in the destination root",
      },
    },
    required: [],
  },
};

export async function handleDeleteFile(args: {
  destination?: string;
  path?: string;
  filename?: string;
}) {
  const relativePath = args.path ?? args.filename;
  if (!relativePath) {
    throw new Error("Either path or filename is required");
  }

  const destination = normalizeDestinationName(args.destination);
  const { absolutePath: filePath, root, safeRelativePath } = resolveManagedPath(
    destination,
    relativePath
  );

  try {
    await unlink(filePath);
    await pruneEmptyDirectories(root, filePath);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return {
        content: [
          {
            type: "text" as const,
            text: `File not found in ${destination}: ${safeRelativePath}`,
          },
        ],
      };
    }
    throw err;
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `File deleted from ${destination}: ${safeRelativePath}`,
      },
    ],
  };
}
