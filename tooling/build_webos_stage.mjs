import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(repositoryRoot, "apps", "tv", "lg-webos");
const assetDirectory = path.join(sourceDirectory, "assets", "presentation");
const outputDirectory = path.join(repositoryRoot, ".tmp", "lg-webos-stage-app");
const registryPath = path.join(sourceDirectory, "presentation-assets.json");
const MAXIMUM_STAGE_DOCUMENT_BYTES = 5 * 1024 * 1024;
const MAXIMUM_PACKAGE_BYTES = 6 * 1024 * 1024;
const LOGICAL_IDENTIFIER = /^[a-z][a-z0-9_.-]{0,127}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

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

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function validatedPng(bytes) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    bytes.length < 33 ||
    !bytes.subarray(0, 8).equals(signature) ||
    bytes.readUInt32BE(8) !== 13 ||
    bytes.toString("ascii", 12, 16) !== "IHDR" ||
    bytes.readUInt32BE(16) !== 1920 ||
    bytes.readUInt32BE(20) !== 1080
  ) {
    throw new Error("Approved Stage image must be a 1920-by-1080 PNG");
  }
}

export function validatedWav(bytes) {
  if (
    bytes.length < 44 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WAVE"
  ) throw new Error("Approved Stage atmosphere must be a RIFF/WAVE file");
  let offset = 12;
  let format = null;
  let dataBytes = null;
  while (offset + 8 <= bytes.length) {
    const chunk = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > bytes.length) throw new Error("Stage WAV contains a truncated chunk");
    if (chunk === "fmt ") {
      if (size < 16) throw new Error("Stage WAV format chunk is incomplete");
      format = {
        encoding: bytes.readUInt16LE(start),
        channels: bytes.readUInt16LE(start + 2),
        sampleRate: bytes.readUInt32LE(start + 4),
        bitsPerSample: bytes.readUInt16LE(start + 14),
      };
    } else if (chunk === "data") {
      dataBytes = size;
    }
    offset = start + size + (size % 2);
  }
  if (
    !format ||
    format.encoding !== 1 ||
    format.channels !== 2 ||
    format.sampleRate !== 44_100 ||
    format.bitsPerSample !== 16 ||
    dataBytes !== 44_100 * 8 * 2 * 2
  ) {
    throw new Error("Approved Stage atmosphere must be eight-second stereo 44.1-kHz 16-bit PCM");
  }
}

export function validatedMp3(bytes) {
  if (bytes.length < 180) throw new Error("Approved Stage atmosphere must be an MPEG-1 Layer III file");
  const header = bytes.readUInt32BE(0);
  const version = (header >>> 19) & 0x3;
  const layer = (header >>> 17) & 0x3;
  const protection = (header >>> 16) & 0x1;
  const bitrateIndex = (header >>> 12) & 0xf;
  const sampleRateIndex = (header >>> 10) & 0x3;
  const channelMode = (header >>> 6) & 0x3;
  if (
    ((header & 0xffe00000) >>> 0) !== 0xffe00000 ||
    version !== 0x3 ||
    layer !== 0x1 ||
    bitrateIndex !== 0x9 ||
    sampleRateIndex !== 0x0 ||
    channelMode === 0x3
  ) {
    throw new Error("Approved Stage atmosphere must be 128-kbps 44.1-kHz stereo MPEG-1 Layer III");
  }

  const infoOffset = 4 + (protection === 0 ? 2 : 0) + 32;
  if (bytes.toString("ascii", infoOffset, infoOffset + 4) !== "Info") {
    throw new Error("Approved Stage MP3 must contain deterministic LAME gapless metadata");
  }
  const flags = bytes.readUInt32BE(infoOffset + 4);
  let cursor = infoOffset + 8;
  if ((flags & 0x1) === 0) throw new Error("Approved Stage MP3 frame count is missing");
  const frameCount = bytes.readUInt32BE(cursor);
  cursor += 4;
  if ((flags & 0x2) === 0) throw new Error("Approved Stage MP3 byte count is missing");
  const declaredBytes = bytes.readUInt32BE(cursor);
  cursor += 4;
  if (flags & 0x4) cursor += 100;
  if (flags & 0x8) cursor += 4;
  if (cursor + 24 > bytes.length || bytes.toString("ascii", cursor, cursor + 4) !== "LAME") {
    throw new Error("Approved Stage MP3 must contain a LAME encoder tag");
  }
  const delayPadding = bytes.readUIntBE(cursor + 21, 3);
  const encoderDelay = delayPadding >>> 12;
  const endPadding = delayPadding & 0xfff;
  const effectiveSamples = frameCount * 1152 - encoderDelay - endPadding;
  if (declaredBytes !== bytes.length || effectiveSamples !== 44_100 * 8) {
    throw new Error("Approved Stage atmosphere must decode to exactly eight seconds");
  }
}

export function validateAssetBytes(asset, bytes) {
  if (bytes.length > asset.maximum_bytes) {
    throw new Error(`Packaged Stage asset exceeds its bound: ${asset.id}`);
  }
  if (digest(bytes) !== asset.sha256) {
    throw new Error(`Packaged Stage asset digest mismatch: ${asset.id}`);
  }
  if (asset.kind === "image" && asset.mime_type === "image/png") validatedPng(bytes);
  else if (asset.kind === "audio" && asset.mime_type === "audio/mpeg") validatedMp3(bytes);
  else throw new Error("Packaged Stage media kind and MIME type disagree");
}

async function embeddedRegistry() {
  const definition = JSON.parse(await readFile(registryPath, "utf8"));
  if (
    definition?.schema_version !== 1 ||
    !LOGICAL_IDENTIFIER.test(definition.manifest_revision) ||
    !Array.isArray(definition.assets) ||
    definition.assets.length !== 2
  ) throw new Error("Invalid packaged Stage media registry");
  const assets = {};
  const kinds = new Set();
  for (const asset of definition.assets) {
    if (
      !asset ||
      !LOGICAL_IDENTIFIER.test(asset.id) ||
      Object.hasOwn(assets, asset.id) ||
      !["image", "audio"].includes(asset.kind) ||
      kinds.has(asset.kind) ||
      !["image/png", "audio/mpeg"].includes(asset.mime_type) ||
      !SHA256.test(asset.sha256) ||
      !Number.isSafeInteger(asset.maximum_bytes) ||
      asset.maximum_bytes < 1 ||
      typeof asset.source_path !== "string"
    ) throw new Error("Invalid packaged Stage media asset entry");
    const file = path.resolve(sourceDirectory, asset.source_path);
    if (!file.startsWith(`${assetDirectory}${path.sep}`)) {
      throw new Error("Packaged Stage media source escapes the approved asset directory");
    }
    const bytes = await readFile(file);
    validateAssetBytes(asset, bytes);
    kinds.add(asset.kind);
    assets[asset.id] = {
      kind: asset.kind,
      mime_type: asset.mime_type,
      sha256: asset.sha256,
      source: `data:${asset.mime_type};base64,${bytes.toString("base64")}`,
    };
  }
  if (!kinds.has("image") || !kinds.has("audio")) throw new Error("Stage registry requires one image and one audio asset");
  return { manifest_revision: definition.manifest_revision, assets };
}

export async function buildStage() {
const [
  indexSource,
  shellStyles,
  shellScript,
  stageSource,
  stageStyles,
  stageCore,
  stageMedia,
  stageScript,
  mediaRegistry,
] = await Promise.all([
  source("index.html"),
  source("shell.css"),
  source("shell.js"),
  source("stage.html"),
  source("styles.css"),
  source("stage-core.js"),
  source("stage-media.js"),
  source("stage.js"),
  embeddedRegistry(),
]);

let packagedIndex = replaceExactly(
  indexSource,
  "default-src 'self'; frame-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'",
  "default-src 'none'; frame-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'",
  "shell content-security-policy",
);
packagedIndex = replaceExactly(
  packagedIndex,
  '<link rel="stylesheet" href="shell.css">',
  `<style>\n${shellStyles}\n</style>`,
  "shell stylesheet",
);
packagedIndex = replaceExactly(
  packagedIndex,
  '<script src="shell.js"></script>',
  `<script>\n${shellScript}\n</script>`,
  "shell script",
);

let packagedStage = replaceExactly(
  stageSource,
  "default-src 'self'; connect-src https://api.test.guiltyparty.app wss://api.test.guiltyparty.app; img-src 'none'; media-src 'none'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
  "default-src 'none'; connect-src https://api.test.guiltyparty.app wss://api.test.guiltyparty.app; img-src data:; media-src data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'",
  "Stage content-security-policy",
);
packagedStage = replaceExactly(
  packagedStage,
  '<link rel="stylesheet" href="styles.css">',
  `<style>\n${stageStyles}\n</style>`,
  "Stage stylesheet",
);
packagedStage = replaceExactly(
  packagedStage,
  "  <!-- GP_STAGE_MEDIA_REGISTRY -->",
  `  <script>window.GuiltyPartyStageMediaRegistry = Object.freeze(${JSON.stringify(mediaRegistry)});</script>`,
  "Stage media registry marker",
);
packagedStage = replaceExactly(
  packagedStage,
  '  <script src="stage-core.js"></script>\n  <script src="stage-media.js"></script>\n  <script src="stage.js"></script>',
  `  <script>\n${stageCore}\n  </script>\n  <script>\n${stageMedia}\n  </script>\n  <script>\n${stageScript}\n  </script>`,
  "Stage scripts",
);

if (Buffer.byteLength(packagedStage) > MAXIMUM_STAGE_DOCUMENT_BYTES) {
  throw new Error("Generated Stage document exceeds the approved size bound");
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDirectory, "index.html"), packagedIndex),
  writeFile(path.join(outputDirectory, "stage.html"), packagedStage),
  cp(path.join(sourceDirectory, "appinfo.json"), path.join(outputDirectory, "appinfo.json")),
  cp(path.join(sourceDirectory, "icon.png"), path.join(outputDirectory, "icon.png")),
]);
const packagedFiles = await readdir(outputDirectory);
const packageBytes = (
  await Promise.all(packagedFiles.map((file) => stat(path.join(outputDirectory, file))))
).reduce((total, file) => total + file.size, 0);
if (packageBytes > MAXIMUM_PACKAGE_BYTES) throw new Error("Generated Stage package exceeds the approved size bound");

process.stdout.write(
  `Built packaged Stage source at ${path.relative(repositoryRoot, outputDirectory)} (${packageBytes} bytes)\n`,
);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await buildStage();
