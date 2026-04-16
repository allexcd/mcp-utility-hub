import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

function createTempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function runNodeScript(script, env = {}) {
  return execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
  }).trim();
}

test("create_downloadable_file overwrites the same file by default", () => {
  const downloadsDir = createTempDir("mcp-hub-overwrite-");

  try {
    const output = runNodeScript(
      `
        import { readdirSync, readFileSync } from "node:fs";
        import { join } from "node:path";
        import { handleCreateFile } from "./dist/tools/create-file.js";

        const first = await handleCreateFile({ filename: "report.md", content: "first" });
        const second = await handleCreateFile({ filename: "report.md", content: "second" });
        const files = readdirSync(process.env.MCP_DOWNLOADS_DIR).sort();
        const content = readFileSync(join(process.env.MCP_DOWNLOADS_DIR, "report.md"), "utf8");

        console.log(JSON.stringify({ first: first.content[0].text, second: second.content[0].text, files, content }));
      `,
      {
        MCP_DEFAULT_DESTINATION: "downloads",
        MCP_DOWNLOADS_DIR: downloadsDir,
      }
    );

    const result = JSON.parse(output);
    assert.deepEqual(result.files, ["report.md"]);
    assert.equal(result.content, "second");
    assert.match(result.second, /Saved: .*report\.md/);
    assert.match(result.second, /File URI: file:\/\//);
  } finally {
    rmSync(downloadsDir, { recursive: true, force: true });
  }
});

test("forced destination and subdirectory override prompt omissions", () => {
  const downloadsDir = createTempDir("mcp-hub-forced-");

  try {
    const output = runNodeScript(
      `
        import { handleCreateFile } from "./dist/tools/create-file.js";
        const result = await handleCreateFile({ filename: "TEL_Position.md", content: "# test" });
        console.log(result.content[0].text);
      `,
      {
        MCP_DEFAULT_DESTINATION: "downloads",
        MCP_DOWNLOADS_DIR: downloadsDir,
        MCP_FORCE_DESTINATION: "downloads",
        MCP_FORCE_SUBDIRECTORY: "lmstudio-files",
      }
    );

    assert.match(output, /Effective subdirectory: lmstudio-files/);
    assert.match(output, /Relative path: lmstudio-files\/TEL_Position\.md/);
    assert.match(output, new RegExp(`Saved: ${downloadsDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/lmstudio-files/TEL_Position\\.md`));
  } finally {
    rmSync(downloadsDir, { recursive: true, force: true });
  }
});

test("list_generated_files ignores hidden files and delete_generated_file prunes empty directories", () => {
  const downloadsDir = createTempDir("mcp-hub-list-delete-");
  mkdirSync(join(downloadsDir, "nested"), { recursive: true });
  writeFileSync(join(downloadsDir, ".DS_Store"), "ignore me");

  try {
    const output = runNodeScript(
      `
        import { existsSync, writeFileSync } from "node:fs";
        import { join } from "node:path";
        import { handleCreateFile } from "./dist/tools/create-file.js";
        import { handleDeleteFile } from "./dist/tools/delete-file.js";
        import { handleListFiles } from "./dist/tools/list-files.js";

        writeFileSync(join(process.env.MCP_DOWNLOADS_DIR, ".DS_Store"), "ignore me");
        await handleCreateFile({ filename: "visible.md", content: "# visible", destination: "downloads", subdirectory: "nested" });
        const listed = await handleListFiles({ destination: "downloads" });
        await handleDeleteFile({ destination: "downloads", path: "nested/visible.md" });

        console.log(JSON.stringify({
          listed: listed.content[0].text,
          nestedExists: existsSync(join(process.env.MCP_DOWNLOADS_DIR, "nested"))
        }));
      `,
      {
        MCP_DEFAULT_DESTINATION: "downloads",
        MCP_DOWNLOADS_DIR: downloadsDir,
      }
    );

    const result = JSON.parse(output);
    assert.match(result.listed, /nested\/visible\.md/);
    assert.doesNotMatch(result.listed, /\.DS_Store/);
    assert.equal(result.nestedExists, false);
  } finally {
    rmSync(downloadsDir, { recursive: true, force: true });
  }
});

test("CLI helper exposes help and version output", () => {
  const help = execFileSync(process.execPath, ["./bin/mcp-utility-hub.js", "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const version = execFileSync(process.execPath, ["./bin/mcp-utility-hub.js", "--version"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();

  assert.match(help, /Starts the MCP server on stdio/);
  assert.match(help, /npx -y mcp-utility-hub/);
  assert.equal(version, packageJson.version);
});
