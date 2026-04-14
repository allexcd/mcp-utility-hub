import { createServer, IncomingMessage, ServerResponse } from "http";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";
import { join, extname, resolve } from "path";
import { EXPORT_DIR, FILE_SERVER_PORT, FILE_SERVER_HOST } from "./config.js";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
};

function getMimeType(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Only allow GET requests
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed");
    return;
  }

  // Parse and decode the requested filename
  const url = new URL(req.url || "/", `http://${FILE_SERVER_HOST}:${FILE_SERVER_PORT}`);
  const requestedPath = decodeURIComponent(url.pathname).slice(1); // Remove leading /

  if (!requestedPath) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad Request");
    return;
  }

  // Resolve and confine to export directory
  const exportRoot = resolve(EXPORT_DIR);
  const filePath = resolve(join(EXPORT_DIR, requestedPath));

  if (!filePath.startsWith(exportRoot + "/")) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  // Check file exists
  if (!existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, {
      "Content-Type": mimeType,
      "Content-Length": fileStat.size,
      "Content-Disposition": `attachment; filename="${requestedPath}"`,
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
}

export function startFileServer(): void {
  const server = createServer(handleRequest);
  server.listen(FILE_SERVER_PORT, FILE_SERVER_HOST, () => {
    // Log to stderr — stdout is reserved for MCP stdio transport
    process.stderr.write(
      `File server listening on http://${FILE_SERVER_HOST}:${FILE_SERVER_PORT}\n`
    );
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      process.stderr.write(
        `Port ${FILE_SERVER_PORT} is already in use. File server not started.\n`
      );
    } else {
      process.stderr.write(`File server error: ${err.message}\n`);
    }
  });
}
