import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { startFileServer } from "./file-server.js";
import { createFileToolDefinition, handleCreateFile } from "./tools/create-file.js";
import { listFilesToolDefinition, handleListFiles } from "./tools/list-files.js";
import { deleteFileToolDefinition, handleDeleteFile } from "./tools/delete-file.js";

const server = new Server(
  { name: "mcp-utility-hub", version: "1.0.0" },
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
      return handleCreateFile(args as { filename: string; content: string });
    case "list_generated_files":
      return handleListFiles();
    case "delete_generated_file":
      return handleDeleteFile(args as { filename: string });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the built-in file server for download links
startFileServer();

// Connect MCP server via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
