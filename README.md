# MCP Utility Hub

`mcp-utility-hub` is an MCP server that lets LLMs create files directly on the user's machine in managed, user-visible folders.

It is designed for clients like LM Studio, Claude Desktop, and other MCP-compatible apps that need a safe way to save Markdown, CSV, JSON, code, and text files without inventing arbitrary filesystem paths.

## Why Use It

- Files are written to real folders on the user's machine, not hidden temp storage.
- Output placement can be enforced with environment variables.
- Repeated tool calls overwrite the same file by default instead of creating endless numbered copies.
- Responses include both the saved absolute path and a best-effort `file://` URI.

## Available Tools

| Tool | Purpose | Important Behavior |
|------|---------|--------------------|
| `create_downloadable_file` | Create a file in a managed destination | Returns the saved local path and `file://` URI. Defaults to overwrite on conflict. |
| `list_generated_files` | List created files | Shows relative path, size, date, absolute path, and `file://` URI. Hidden files like `.DS_Store` are ignored. |
| `delete_generated_file` | Delete a created file | Removes the file and prunes empty directories left behind. |

## Simplest Installation

Recommended for LM Studio:

```json
{
  "mcpServers": {
    "mcp-utility-hub": {
      "command": "npx",
      "args": ["-y", "mcp-utility-hub"],
      "env": {
        "MCP_DEFAULT_DESTINATION": "downloads",
        "MCP_DOWNLOADS_DIR": "/Users/you/Downloads/mcp-utility-hub",
        "MCP_FORCE_DESTINATION": "downloads",
        "MCP_FORCE_SUBDIRECTORY": "lmstudio-files"
      }
    }
  }
}
```

With that setup, files created without an explicit location will always land in:

```text
/Users/you/Downloads/mcp-utility-hub/lmstudio-files
```

Optional global install:

```bash
npm install -g mcp-utility-hub
```

Then your LM Studio `mcp.json` can use:

```json
{
  "mcpServers": {
    "mcp-utility-hub": {
      "command": "mcp-utility-hub",
      "env": {
        "MCP_DEFAULT_DESTINATION": "downloads",
        "MCP_DOWNLOADS_DIR": "/Users/you/Downloads/mcp-utility-hub",
        "MCP_FORCE_DESTINATION": "downloads",
        "MCP_FORCE_SUBDIRECTORY": "lmstudio-files"
      }
    }
  }
}
```

## Simplest Uninstall

If you use the recommended `npx` setup:

1. Remove the `mcp-utility-hub` entry from LM Studio's `mcp.json`
2. Reload LM Studio

No npm uninstall command is required, because `npx` does not create a persistent global install.

If you installed globally:

```bash
npm uninstall -g mcp-utility-hub
```

Important: uninstalling the package does not delete files that were already created in the output folders. Those remain on disk until you remove them manually or through `delete_generated_file`.

## Configuration

All runtime behavior is configured with environment variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_DEFAULT_DESTINATION` | `downloads` | Default destination when the tool call does not specify one |
| `MCP_DEFAULT_SUBDIRECTORY` | empty | Default subdirectory when the tool call does not specify one |
| `MCP_DOWNLOADS_DIR` | `~/Downloads/mcp-utility-hub` | Root folder for the `downloads` destination |
| `MCP_DESKTOP_DIR` | `~/Desktop/mcp-utility-hub` | Root folder for the `desktop` destination |
| `MCP_DOCUMENTS_DIR` | `~/Documents/mcp-utility-hub` | Root folder for the `documents` destination |
| `MCP_FORCE_DESTINATION` | unset | Force every created file into this destination regardless of what the model requests |
| `MCP_FORCE_SUBDIRECTORY` | unset | Force every created file into this subdirectory regardless of what the model requests |
| `MCP_EXPORT_DIR` | unset | Optional legacy `export` destination |

The most important variables for LM Studio are usually:

- `MCP_DEFAULT_DESTINATION`
- `MCP_DOWNLOADS_DIR`
- `MCP_FORCE_DESTINATION`
- `MCP_FORCE_SUBDIRECTORY`

If you want deterministic output placement, set the `MCP_FORCE_*` variables and the model no longer needs to mention a location in the prompt.

## Quick Test

Use these prompts in LM Studio after adding the MCP server and reloading the app.

### 1. Basic Create

```text
Create a markdown file called test-notes.md in the downloads destination, inside a subdirectory called lmstudio-demo. Put a title and 3 bullet points in it.
```

Expected result:

- LM Studio should show a tool-call confirmation
- The file should be created in your managed downloads folder
- The response should include:
  - `Saved: /absolute/path/...`
  - `File URI: file:///absolute/path/...`

### 2. List Files

```text
List the generated files in the downloads destination.
```

Expected result:

- The output should include `lmstudio-demo/test-notes.md`
- The output should include the saved absolute path
- The output should include the `file://` URI

### 3. Delete File

```text
Delete the file lmstudio-demo/test-notes.md from the downloads destination.
```

Expected result:

- The file should be removed
- If the containing folder becomes empty, it should be pruned automatically

### 4. Forced-Location Check

If your `mcp.json` contains:

```json
{
  "MCP_DEFAULT_DESTINATION": "downloads",
  "MCP_DOWNLOADS_DIR": "/Users/you/Downloads/mcp-utility-hub",
  "MCP_FORCE_DESTINATION": "downloads",
  "MCP_FORCE_SUBDIRECTORY": "lmstudio-files"
}
```

Then this prompt:

```text
Create a markdown file called TEL_Position.md with a short sample description.
```

Expected result:

- The file should be saved to:

```text
/Users/you/Downloads/mcp-utility-hub/lmstudio-files/TEL_Position.md
```

- The tool response should show:
  - `Destination: downloads`
  - `Effective subdirectory: lmstudio-files`

## Example Tool Calls

Create a Markdown file:

```json
{
  "filename": "meeting-notes.md",
  "content": "# Notes\n\n- Item 1\n- Item 2",
  "destination": "downloads",
  "subdirectory": "client-a",
  "on_conflict": "overwrite"
}
```

Delete that file later:

```json
{
  "destination": "downloads",
  "path": "client-a/meeting-notes.md"
}
```

If you intentionally want numbered variants instead of overwrite behavior:

```json
{
  "filename": "meeting-notes.md",
  "content": "# Notes",
  "destination": "downloads",
  "subdirectory": "client-a",
  "on_conflict": "suffix"
}
```

## CLI

After installation, the package exposes:

```bash
mcp-utility-hub --help
mcp-utility-hub --version
```

You can also test the package without installing globally:

```bash
npx -y mcp-utility-hub --help
```

## Development

Clone the repo and install dependencies:

```bash
npm install
```

Useful commands:

```bash
npm run build
npm test
npm run verify
```

What these do:

- `npm run build` cleans `dist/` and compiles the package
- `npm test` rebuilds and runs purposeful tests for overwrite behavior, forced placement, directory pruning, and CLI entrypoints
- `npm run verify` runs tests and a dry-run npm package check

GitHub Actions runs `npm run verify` on Node 18, 20, and 22 for pushes and pull requests.

## Release Workflow

The package includes a release script:

```bash
npm run release
```

What it does:

1. Requires a clean git working tree
2. Recommends a semver bump based on commits since the last tag
   - `major` for breaking changes
   - `minor` for `feat` commits
   - `patch` otherwise
3. Runs `npm test`
4. Runs `npm run pack:dry`
5. Runs `npm version <bump>` to update version metadata and create the release commit/tag

You can override the bump explicitly:

```bash
npm run release -- patch
npm run release -- minor
npm run release -- major
```

After a successful release:

```bash
git push && git push --tags
npm publish
```

## Notes for Host Apps

- The files are created on the user's real filesystem, not in localhost storage.
- `file://` URIs are best-effort only. Some host apps render them as clickable links, others do not.
- If a host app does not make the URI clickable, the absolute `Saved:` path is still the source of truth.
