# MCP Utility Hub

`mcp-utility-hub` is an MCP server that provides practical utility tools for
LLMs, including safe file creation and file management in managed,
user-visible folders.

It is designed for LM Studio, Ollama, and other MCP-compatible apps that
benefit from practical utility tools, including a safe way to save Markdown,
CSV, JSON, code, and text files without inventing arbitrary filesystem paths.

## Available Tools

| Tool | Purpose | Important Behavior |
|------|---------|--------------------|
| `create_downloadable_file` | Create a file in a managed destination | Returns the saved local path and `file://` URI. Defaults to overwrite on conflict. |
| `list_generated_files` | List created files | Shows relative path, size, date, absolute path, and `file://` URI. Hidden files like `.DS_Store` are ignored. |
| `delete_generated_file` | Delete a created file | Removes the file and prunes empty directories left behind. |

## How LM Studio Discovers the MCP Server

LM Studio reads `~/.lmstudio/config/mcp.json` on startup. For every entry in
`mcpServers`, it **spawns the process** described by `command` + `args` and
communicates with it over stdio using the MCP protocol.

There is no separate "location" field. The `command` value is the entire discovery
mechanism. It can be `npx` to resolve from npm, `node` to run a local script, or
any other executable on your `PATH`.

> **Note:** `MCP_DOWNLOADS_DIR` and similar environment variables only control
> where output files are saved on disk. They have nothing to do with how LM Studio
> finds or starts the server.

## Installation

Node.js 20 or later is required.

### Option A: via npm (recommended if published)

No local setup required. LM Studio will download and run the package automatically
via `npx`:

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

> **Important:** The `-y` flag belongs to `npx`, not `node`. Do **not** carry it
> over if you switch to a local setup. It will cause a `bad option: -y` error.

Optional global install to avoid the `npx` download on each start:

```bash
npm install -g mcp-utility-hub
```

Then use `"command": "mcp-utility-hub"` with no `args` needed:

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

### Option B: Local build (no npm package required)

Use this when the package is not published to npm, or when you are developing
locally.

**1. Clone and build**

```bash
git clone https://github.com/allexcd/mcp-utility-hub.git /Users/you/workspace/mcp/mcp-utility-hub
cd /Users/you/workspace/mcp/mcp-utility-hub
npm install
npm run build
```

**2. Configure LM Studio** to run the built script via `node`:

```json
{
  "mcpServers": {
    "mcp-utility-hub": {
      "command": "node",
      "args": ["/Users/you/workspace/mcp/mcp-utility-hub/dist/index.js"],
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

> **Why `node` instead of pointing directly to the script?**
> Calling the `.js` file directly requires the file to be executable with
> `chmod +x` and to have a `#!/usr/bin/env node` shebang. Using `"command": "node"`
> with the path as an argument avoids both requirements and is more portable.

**3. Reload LM Studio** after saving `mcp.json`.

## Uninstall

**npx setup:** Remove the `mcp-utility-hub` entry from `mcp.json` and reload LM
Studio. No `npm uninstall` needed because `npx` does not create a persistent install.

**Global install:**

```bash
npm uninstall -g mcp-utility-hub
```

> Uninstalling the package does not delete files that were already created in the
> output folders. Remove them manually or via `delete_generated_file`.

## Configuration

All runtime behavior is controlled with environment variables passed in the `env`
block of `mcp.json`.

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_DEFAULT_DESTINATION` | `downloads` | Default destination when the tool call does not specify one |
| `MCP_DEFAULT_SUBDIRECTORY` | empty | Default subdirectory when the tool call does not specify one |
| `MCP_DOWNLOADS_DIR` | `~/Downloads/mcp-utility-hub` | Root folder for the `downloads` destination |
| `MCP_DESKTOP_DIR` | `~/Desktop/mcp-utility-hub` | Root folder for the `desktop` destination |
| `MCP_DOCUMENTS_DIR` | `~/Documents/mcp-utility-hub` | Root folder for the `documents` destination |
| `MCP_FORCE_DESTINATION` | unset | Force every created file into this destination regardless of prompt |
| `MCP_FORCE_SUBDIRECTORY` | unset | Force every created file into this subdirectory regardless of prompt |
| `MCP_EXPORT_DIR` | unset | Optional legacy `export` destination |

Set `MCP_FORCE_DESTINATION` and `MCP_FORCE_SUBDIRECTORY` for deterministic output
placement. The model no longer needs to mention a location in the prompt.

## Troubleshooting

### `Permission denied`

```text
stderr: sh: /path/to/dist/index.js: Permission denied
```

Use `"command": "node"` and pass the script path as the first argument instead of
pointing directly to the `.js` file. See Option B above.

### `bad option: -y`

```text
stderr: node: bad option: -y
```

You copied the `"-y"` argument from the `npx` setup into a `node` setup. `-y` is
an `npx`-only flag. Remove it from `args` when using `"command": "node"`.

### MCP server not picked up

After any change to `mcp.json`, you must **reload LM Studio** for the new
configuration to take effect.

## Quick Test

Use these prompts in LM Studio after adding the server and reloading.

### 1. Basic Create

```text
Create a markdown file called test-notes.md in the downloads destination,
inside a subdirectory called lmstudio-demo. Put a title and 3 bullet points in it.
```

Expected result:

- LM Studio shows a tool-call confirmation.
- The file is created in your managed downloads folder.
- The response includes `Saved: /absolute/path/...` and `File URI: file:///absolute/path/...`.

### 2. List Files

```text
List the generated files in the downloads destination.
```

Expected result: output includes `lmstudio-demo/test-notes.md` with its absolute
path and `file://` URI.

### 3. Delete File

```text
Delete the file lmstudio-demo/test-notes.md from the downloads destination.
```

Expected result: file is removed. Empty containing folder is pruned automatically.

### 4. Forced-Location Check

With `MCP_FORCE_DESTINATION=downloads`, `MCP_DOWNLOADS_DIR=/Users/you/Downloads/mcp-utility-hub`,
and `MCP_FORCE_SUBDIRECTORY=lmstudio-files` set, this prompt:

```text
Create a markdown file called notes.md with a short sample description.
```

Should always produce a file at:

```text
/Users/you/Downloads/mcp-utility-hub/lmstudio-files/notes.md
```

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

Create numbered variants instead of overwriting:

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

```bash
mcp-utility-hub --help
mcp-utility-hub --version
```

Test without installing globally:

```bash
npx -y mcp-utility-hub --help
```

## Development

```bash
npm install
npm run build   # cleans dist/ and compiles
npm test        # rebuilds and runs tests
npm run verify  # tests + dry-run npm package check
```

GitHub Actions runs `npm run verify` on Node 20 and 22 for every push and
pull request.

## Release Workflow

```bash
npm run release          # auto-detects bump (major/minor/patch)
npm run release -- patch # override bump
```

After a successful release:

```bash
git push && git push --tags
npm publish
```

## Notes for Host Apps

- Files are created on the user's real filesystem, not in localhost storage.
- `file://` URIs are best-effort only. Some host apps render them as clickable
  links. Others do not. The absolute `Saved:` path is always the source of truth.
