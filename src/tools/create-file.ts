import { writeFile, mkdir, access } from "fs/promises";
import { dirname } from "path";
import { resolveExportPath, sanitizeFilename } from "../utils.js";
import { EXPORT_DIR, BASE_URL } from "../config.js";

export const createFileToolDefinition = {
  name: "create_downloadable_file",
  description:
    "Creates a file with the given content and returns a download link. " +
    "Use this when the user asks for a document, report, CSV, JSON, Markdown, code file, or any other downloadable content.",
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
    },
    required: ["filename", "content"],
  },
};

export async function handleCreateFile(args: { filename: string; content: string }) {
  const safeName = sanitizeFilename(args.filename);
  let filePath = resolveExportPath(safeName);

  // Handle filename collisions — append a number suffix
  let finalName = safeName;
  try {
    await access(filePath);
    // File exists, find an available name
    const dotIndex = safeName.lastIndexOf(".");
    const base = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
    const ext = dotIndex > 0 ? safeName.slice(dotIndex) : "";
    let counter = 1;
    do {
      finalName = `${base}_${counter}${ext}`;
      filePath = resolveExportPath(finalName);
      counter++;
      try {
        await access(filePath);
      } catch {
        break; // File doesn't exist, use this name
      }
    } while (counter < 1000);
  } catch {
    // File doesn't exist, use original name
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, args.content, "utf-8");

  const downloadUrl = `${BASE_URL}/${encodeURIComponent(finalName)}`;

  return {
    content: [
      {
        type: "text" as const,
        text: `File created successfully.\n\nDownload: [${finalName}](${downloadUrl})\nPath: ${filePath}`,
      },
    ],
  };
}
