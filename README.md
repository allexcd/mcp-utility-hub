# MCP Utility Hub

An MCP server that lets LLM chat models create downloadable files. Works with any MCP-compatible client — LM Studio, Claude Desktop, Ollama, etc.

## Tools

| Tool | Description |
|------|-------------|
| `create_downloadable_file` | Creates a file and returns a download link |
| `list_generated_files` | Lists all generated files with sizes and download URLs |
| `delete_generated_file` | Deletes a previously generated file |

## Setup

```bash
npm install
npm run build
```

## Configuration

All settings via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_EXPORT_DIR` | `~/mcp-exports` | Directory for generated files |
| `MCP_FILE_SERVER_PORT` | `8765` | Port for the built-in HTTP file server |
| `MCP_FILE_SERVER_HOST` | `127.0.0.1` | Host for the file server |

## MCP Client Configuration

### LM Studio

Add to your LM Studio `mcp.json`:

```json
{
  "mcpServers": {
    "mcp-utility-hub": {
      "command": "node",
      "args": ["/path/to/mcp-utility-hub/dist/index.js"],
      "env": {
        "MCP_EXPORT_DIR": "/Users/you/Downloads/mcp-exports"
      }
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-utility-hub": {
      "command": "node",
      "args": ["/path/to/mcp-utility-hub/dist/index.js"]
    }
  }
}
```

### Generic MCP Client

The server uses stdio transport. Run with:

```bash
node dist/index.js
```

## Development

```bash
npm run dev    # Run with tsx (auto-reload)
npm run build  # Compile TypeScript
npm start      # Run compiled output
```

## How It Works

1. The MCP server registers tools that LLMs can call during chat
2. When a model calls `create_downloadable_file`, the server writes the file to the export directory
3. A built-in HTTP server serves the files, so the model can return a clickable download link
4. Users click the link to download the file to their chosen location
