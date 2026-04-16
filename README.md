# MCP Utility Hub

[![CI](https://github.com/allexcd/mcp-utility-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/allexcd/mcp-utility-hub/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/mcp-utility-hub)](https://www.npmjs.com/package/mcp-utility-hub)
[![npm downloads](https://img.shields.io/npm/dm/mcp-utility-hub)](https://www.npmjs.com/package/mcp-utility-hub)
[![License: MIT](https://img.shields.io/npm/l/mcp-utility-hub)](LICENSE)
[![Node.js >=20](https://img.shields.io/node/v/mcp-utility-hub)](https://www.npmjs.com/package/mcp-utility-hub)
[![GitHub stars](https://img.shields.io/github/stars/allexcd/mcp-utility-hub?style=social)](https://github.com/allexcd/mcp-utility-hub)

`mcp-utility-hub` is an MCP server that provides practical utility tools for
LM Studio, Ollama, and other MCP-compatible apps.

It currently focuses on safe file creation and file management in managed,
user-visible folders, so LLMs can save Markdown, CSV, JSON, code, and text
files without inventing arbitrary filesystem paths.

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
```

Pushing the new version tag triggers GitHub Actions to:

- publish the new version to npm
- create a GitHub Release from the same tag with autogenerated notes

If you want this to work, make sure GitHub Actions has write access for releases:

`Settings > Actions > General > Workflow permissions > Read and write permissions`

## Contributing

### Commit Types

The following types are used in branch names, pull request titles, and commit
messages:

| Type | When to use |
|------|-------------|
| `feat` | Adding a new feature or capability |
| `fix` | Fixing a bug or broken behavior |
| `chore` | Maintenance, configuration, or tooling work with no user-facing feature change |
| `docs` | Documentation-only changes |
| `refactor` | Restructuring code without changing external behavior |
| `test` | Adding, updating, or fixing tests |
| `hotfix` | Urgent fix that needs to go out quickly |

### Branch Names

Branches must follow this pattern:

```text
<type>/<short-description>
```

Rules:

- Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `hotfix`
- Use lowercase letters, numbers, and hyphens only
- Do not use spaces or underscores

Examples:

```text
feat/add-ollama-setup-docs
fix/handle-missing-destination
chore/update-publish-workflow
docs/improve-install-steps
refactor/simplify-config-loading
test/add-create-file-coverage
hotfix/fix-broken-release
```

### Pull Request Titles

Pull request titles must follow this format:

```text
<type>(<scope>): [TICKET-123] - <short description>
```

Rules:

- Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `hotfix`
- Scope is optional
- Ticket is optional
- Description must be lowercase
- Description must not end with a period

Valid examples:

```text
docs: update installation troubleshooting
docs(readme): update installation troubleshooting
feat(config): [MCP-101] - add forced output subdirectory support
fix(release): prevent duplicate github release creation
```

### Commit Messages

Commit messages follow the same subject format as pull request titles:

```text
<type>(<scope>): [TICKET-123] - <short description>
```

Rules:

- Subject line must be 72 characters or fewer
- Scope is optional
- Ticket is optional
- Description must be lowercase
- Description must not end with a period
- Add a body only when the reason for the change is not obvious from the diff

Examples:

```text
docs: update installation troubleshooting
fix(githooks): make pre-push hook portable
feat(config): [MCP-101] - add forced output subdirectory support
```

### Merging Rules

Changes to `main` should go through a branch and pull request.

The repository automation includes:

- `CI` for pull requests to `main`
- `PR Title Check` for semantic pull request titles
- `Publish to npm` when a version tag such as `v1.2.3` is pushed
- automatic `GitHub Release` creation from the same version tag after npm publish succeeds
- `Apply Branch Ruleset` for main-branch protections
- `Dependabot` for npm and GitHub Actions updates

The `main` branch protections require:

- a pull request before merge
- at least 1 approval
- stale approvals to be dismissed after a new push
- passing checks for `check-pr-title`, `lint`, `test (20)`, `test (22)`, and `build`

## Notes for Host Apps

- Files are created on the user's real filesystem, not in localhost storage.
- `file://` URIs are best-effort only. Some host apps render them as clickable
  links. Others do not. The absolute `Saved:` path is always the source of truth.
