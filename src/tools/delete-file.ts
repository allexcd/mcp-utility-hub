import { unlink } from "fs/promises";
import { resolveExportPath } from "../utils.js";

export const deleteFileToolDefinition = {
  name: "delete_generated_file",
  description: "Deletes a previously generated file from the export directory.",
  inputSchema: {
    type: "object" as const,
    properties: {
      filename: {
        type: "string",
        description: "Name of the file to delete",
      },
    },
    required: ["filename"],
  },
};

export async function handleDeleteFile(args: { filename: string }) {
  const filePath = resolveExportPath(args.filename);

  try {
    await unlink(filePath);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return {
        content: [
          { type: "text" as const, text: `File not found: ${args.filename}` },
        ],
      };
    }
    throw err;
  }

  return {
    content: [
      { type: "text" as const, text: `File deleted: ${args.filename}` },
    ],
  };
}
