import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(repositoryRoot, "apps", "tv", "lg-webos");
const outputDirectory = path.join(repositoryRoot, ".tmp", "lg-webos-stage-app");

async function source(name) {
  return readFile(path.join(sourceDirectory, name), "utf8");
}

function replaceExactly(document, needle, replacement, label) {
  const first = document.indexOf(needle);
  if (first < 0 || document.indexOf(needle, first + needle.length) >= 0) {
    throw new Error(`Expected exactly one ${label} in the Stage source`);
  }
  return document.replace(needle, replacement);
}

const [
  indexSource,
  shellStyles,
  shellScript,
  stageSource,
  stageStyles,
  stageCore,
  stageScript
] = await Promise.all([
  source("index.html"),
  source("shell.css"),
  source("shell.js"),
  source("stage.html"),
  source("styles.css"),
  source("stage-core.js"),
  source("stage.js")
]);

let packagedIndex = replaceExactly(
  indexSource,
  "default-src 'self'; frame-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'",
  "default-src 'none'; frame-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'",
  "shell content-security-policy"
);
packagedIndex = replaceExactly(
  packagedIndex,
  '<link rel="stylesheet" href="shell.css">',
  `<style>\n${shellStyles}\n</style>`,
  "shell stylesheet"
);
packagedIndex = replaceExactly(
  packagedIndex,
  '<script src="shell.js"></script>',
  `<script>\n${shellScript}\n</script>`,
  "shell script"
);

let packagedStage = replaceExactly(
  stageSource,
  "default-src 'self'; connect-src https://api.test.guiltyparty.app wss://api.test.guiltyparty.app; img-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
  "default-src 'none'; connect-src https://api.test.guiltyparty.app wss://api.test.guiltyparty.app; img-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'",
  "Stage content-security-policy"
);
packagedStage = replaceExactly(
  packagedStage,
  '<link rel="stylesheet" href="styles.css">',
  `<style>\n${stageStyles}\n</style>`,
  "Stage stylesheet"
);
packagedStage = replaceExactly(
  packagedStage,
  '  <script src="stage-core.js"></script>\n  <script src="stage.js"></script>',
  `  <script>\n${stageCore}\n  </script>\n  <script>\n${stageScript}\n  </script>`,
  "Stage scripts"
);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDirectory, "index.html"), packagedIndex),
  writeFile(path.join(outputDirectory, "stage.html"), packagedStage),
  cp(path.join(sourceDirectory, "appinfo.json"), path.join(outputDirectory, "appinfo.json")),
  cp(path.join(sourceDirectory, "icon.png"), path.join(outputDirectory, "icon.png"))
]);

process.stdout.write(`Built packaged Stage source at ${path.relative(repositoryRoot, outputDirectory)}\n`);
