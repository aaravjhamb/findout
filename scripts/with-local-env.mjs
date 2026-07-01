import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { delimiter, join } from "node:path";

function parseEnv(path) {
  if (!existsSync(path)) return {};
  const env = {};

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }

  return env;
}

const [, , command, ...args] = process.argv;

if (!command) {
  console.error("Usage: node scripts/with-local-env.mjs <command> [...args]");
  process.exit(1);
}

const baseEnv = parseEnv(".env");
const localEnv = parseEnv(".env.local");
const env = { ...process.env, ...baseEnv, ...localEnv };

function resolveCommand(command) {
  if (process.platform !== "win32") return command;
  if (command.endsWith(".cmd") || command.endsWith(".exe")) return command;

  const pathDirs = [
    join(process.cwd(), "node_modules", ".bin"),
    ...(env.PATH ?? "").split(delimiter),
  ];

  for (const dir of pathDirs) {
    const candidate = join(dir, `${command}.cmd`);
    if (existsSync(candidate)) return candidate;
  }

  return command;
}

const resolvedCommand = resolveCommand(command);
const needsShell = process.platform === "win32" && resolvedCommand.endsWith(".cmd");

const child = spawn(resolvedCommand, args, {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
  shell: needsShell,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
