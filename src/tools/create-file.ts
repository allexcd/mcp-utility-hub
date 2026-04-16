import { writeFile, mkdir, access } from "fs/promises";
import { dirname } from "path";
import {
  DEFAULT_DESTINATION,
  DEFAULT_SUBDIRECTORY,
  DESTINATION_NAMES,
  FORCED_DESTINATION,
  FORCED_SUBDIRECTORY,
} from "../config.js";
import {
  buildRelativePath,
  normalizeDestinationName,
  resolveManagedPath,
  toFileUri,
} from "../utils.js";

export const createFileToolDefinition = {
  name: "create_downloadable_file",
  description:
    "Creates a file in a managed user-visible destination and returns the saved local path plus a file:// URI. " +
    "Use this when the user asks for a document, report, CSV, JSON, Markdown, code file, or any other downloadable content. " +
    "Call it once per requested file unless the user explicitly asks for another version.",
  inputSchema: {
    type: "object" as const,
    properties: {
      filename: {
        type: "string",
        description: "Name of the file to create (e.g., report.md, data.csv, notes.txt)",
      },
      content: {
        type: "string",
        description: "The text content to write into the file",
      },
      destination: {
        type: "string",
        description:
          `Optional output destination. Available destinations: ${DESTINATION_NAMES.join(", ")}. ` +
          `Defaults to ${DEFAULT_DESTINATION} unless overridden by server config.`,
      },
      subdirectory: {
        type: "string",
        description:
          "Optional subdirectory inside the chosen destination (e.g., project-notes or reports/weekly), unless overridden by server config.",
      },
      on_conflict: {
        type: "string",
        description:
          "Optional conflict strategy if the target file already exists. " +
          "Use overwrite, reuse, error, or suffix. Defaults to overwrite.",
      },
    },
    required: ["filename", "content"],
  },
};

export async function handleCreateFile(args: {
  filename: string;
  content: string;
  destination?: string;
  subdirectory?: string;
  on_conflict?: string;
}) {
  const destination = normalizeDestinationName(FORCED_DESTINATION || args.destination);
  const effectiveSubdirectory = FORCED_SUBDIRECTORY || args.subdirectory || DEFAULT_SUBDIRECTORY;
  let finalRelativePath = buildRelativePath(args.filename, effectiveSubdirectory);
  let { absolutePath: filePath } = resolveManagedPath(destination, finalRelativePath);
  const slashIndex = finalRelativePath.lastIndexOf("/");
  const directoryPrefix = slashIndex >= 0 ? finalRelativePath.slice(0, slashIndex + 1) : "";
  const originalName = slashIndex >= 0 ? finalRelativePath.slice(slashIndex + 1) : finalRelativePath;
  const conflictStrategy = (args.on_conflict || "overwrite").trim().toLowerCase();

  let finalName = originalName;
  let fileExists = false;
  let fileUri = toFileUri(filePath);

  try {
    await access(filePath);
    fileExists = true;
  } catch {
    fileExists = false;
  }

  if (fileExists && conflictStrategy === "reuse") {
    return {
      content: [
        {
          type: "text" as const,
          text:
            "File already exists. Reusing the existing file.\n\n" +
            `Destination: ${destination}\n` +
            `Effective subdirectory: ${effectiveSubdirectory || "(root)"}\n` +
            `Relative path: ${finalRelativePath}\n` +
            `Saved: ${filePath}\n` +
            `File URI: ${fileUri}\n` +
            "No additional file was created.",
        },
      ],
    };
  }

  if (fileExists && conflictStrategy === "error") {
    return {
      content: [
        {
          type: "text" as const,
          text:
            "File already exists, so no new file was created.\n\n" +
            `Destination: ${destination}\n` +
            `Effective subdirectory: ${effectiveSubdirectory || "(root)"}\n` +
            `Relative path: ${finalRelativePath}\n` +
            `Saved: ${filePath}\n` +
            `File URI: ${fileUri}`,
        },
      ],
    };
  }

  // Only create suffixed variants when explicitly requested.
  try {
    if (fileExists && conflictStrategy === "suffix") {
      const dotIndex = originalName.lastIndexOf(".");
      const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
      const ext = dotIndex > 0 ? originalName.slice(dotIndex) : "";
      let counter = 1;
      do {
        finalName = `${base}_${counter}${ext}`;
        finalRelativePath = `${directoryPrefix}${finalName}`;
        ({ absolutePath: filePath } = resolveManagedPath(destination, finalRelativePath));
        fileUri = toFileUri(filePath);
        counter++;
        try {
          await access(filePath);
        } catch {
          break;
        }
      } while (counter < 1000);
    }
  } catch {
    // Keep the original target for overwrite/default behavior.
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, args.content, "utf-8");
  fileUri = toFileUri(filePath);

  return {
    content: [
      {
        type: "text" as const,
        text:
          "File created successfully.\n\n" +
          `Conflict strategy: ${conflictStrategy}\n` +
          `Destination: ${destination}\n` +
          `Effective subdirectory: ${effectiveSubdirectory || "(root)"}\n` +
          `Relative path: ${finalRelativePath}\n` +
          `Saved: ${filePath}\n` +
          `File URI: ${fileUri}\n` +
          "No additional file creation is needed.",
      },
    ],
  };
}
