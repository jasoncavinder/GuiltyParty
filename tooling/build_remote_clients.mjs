#!/usr/bin/env node

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(repository, ".tmp", "remote-clients");
const webApps = path.join(repository, "apps", "web");
const sharedClient = path.join(webApps, "shared", "control-client.js");
const surfaces = [
  { source: "host", output: "host" },
  { source: "companion", output: "play" },
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const shared = await readFile(sharedClient, "utf8");

for (const surface of surfaces) {
  const source = path.join(webApps, surface.source);
  const destination = path.join(output, surface.output);
  await cp(source, destination, { recursive: true });
  await writeFile(path.join(destination, "control-client.js"), shared, "utf8");
}

console.log(`Remote browser clients built in ${path.relative(repository, output)}`);
