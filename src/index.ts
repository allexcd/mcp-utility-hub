import { readFileSync } from "fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createFileToolDefinition, handleCreateFile } from "./tools/create-file.js";
import { listFilesToolDefinition, handleListFiles } from "./tools/list-files.js";
import { deleteFileToolDefinition, handleDeleteFile } from "./tools/delete-file.js";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};

const server = new Server(
  { name: "mcp-utility-hub", version: packageJson.version },
  { capabilities: { tools: {} } }
);

// Register available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [createFileToolDefinition, listFilesToolDefinition, deleteFileToolDefinition],
}));

// Route tool calls to handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "create_downloadable_file":
      return handleCreateFile(
        args as {
          filename: string;
          content: string;
          destination?: string;
          subdirectory?: string;
        }
      );
    case "list_generated_files":
      return handleListFiles(args as { destination?: string } | undefined);
    case "delete_generated_file":
      return handleDeleteFile(args as { destination?: string; path?: string; filename?: string });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Connect MCP server via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
