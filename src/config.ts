import { homedir } from "os";
import { join } from "path";

export const EXPORT_DIR = process.env.MCP_EXPORT_DIR || join(homedir(), "mcp-exports");
export const FILE_SERVER_PORT = parseInt(process.env.MCP_FILE_SERVER_PORT || "8765", 10);
export const FILE_SERVER_HOST = process.env.MCP_FILE_SERVER_HOST || "127.0.0.1";
export const BASE_URL = `http://${FILE_SERVER_HOST}:${FILE_SERVER_PORT}`;
