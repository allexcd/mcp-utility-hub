#!/usr/bin/env node

import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const args = new Set(process.argv.slice(2));

if (args.has("--help") || args.has("-h")) {
  process.stdout.write(
    [
      "mcp-utility-hub",
      "",
      "Starts the MCP server on stdio for LM Studio, Claude Desktop, and other MCP clients.",
      "",
      "Usage:",
      "  mcp-utility-hub",
      "  mcp-utility-hub --help",
      "  mcp-utility-hub --version",
      "",
      "Common usage:",
      "  npx -y mcp-utility-hub",
      "  npm install -g mcp-utility-hub && mcp-utility-hub",
      "",
      "Configure output placement with env vars such as:",
      "  MCP_DEFAULT_DESTINATION",
      "  MCP_DOWNLOADS_DIR",
      "  MCP_FORCE_DESTINATION",
      "  MCP_FORCE_SUBDIRECTORY",
      "",
    ].join("\n")
  );
  process.exit(0);
}

if (args.has("--version") || args.has("-v")) {
  process.stdout.write(`${packageJson.version}\n`);
  process.exit(0);
}

await import("../dist/index.js");
