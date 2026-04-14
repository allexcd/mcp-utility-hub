import { readdir, stat } from "fs/promises";
import { join } from "path";
import { EXPORT_DIR, BASE_URL } from "../config.js";

export const listFilesToolDefinition = {
  name: "list_generated_files",
  description:
    "Lists all files in the export directory with their names, sizes, creation dates, and download links.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};

export async function handleListFiles() {
  let entries: string[];
  try {
    entries = await readdir(EXPORT_DIR);
  } catch {
    return {
      content: [
        { type: "text" as const, text: "No files found. The export directory does not exist yet." },
      ],
    };
  }

  if (entries.length === 0) {
    return {
      content: [
        { type: "text" as const, text: "No files found in the export directory." },
      ],
    };
  }

  const fileInfos: string[] = [];
  for (const entry of entries) {
    try {
      const filePath = join(EXPORT_DIR, entry);
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) continue;

      const sizeKB = (fileStat.size / 1024).toFixed(1);
      const created = fileStat.birthtime.toISOString().split("T")[0];
      const url = `${BASE_URL}/${encodeURIComponent(entry)}`;
      fileInfos.push(`- **${entry}** (${sizeKB} KB, ${created}) — [Download](${url})`);
    } catch {
      // Skip files we can't stat
    }
  }

  const text = fileInfos.length > 0
    ? `Found ${fileInfos.length} file(s):\n\n${fileInfos.join("\n")}`
    : "No files found in the export directory.";

  return {
    content: [{ type: "text" as const, text }],
  };
}
