import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { gunzipSync } from "zlib";

const DATA_DIR = path.join(import.meta.dirname, "../../../data");

const BASE_URL =
  "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data";

const FILES = [
  "players.csv",
  "appearances.csv",
  "clubs.csv",
  "competitions.csv",
] as const;

async function downloadFile(filename: string): Promise<void> {
  const url = `${BASE_URL}/${filename}.gz`;
  console.log(`Downloading ${filename}.gz...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download ${filename}.gz: ${response.status} ${response.statusText}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const decompressed = gunzipSync(buffer);
  const filePath = path.join(DATA_DIR, filename);
  await writeFile(filePath, decompressed);

  const sizeMB = (decompressed.byteLength / 1024 / 1024).toFixed(1);
  console.log(`  Done: ${filename} (${sizeMB} MB)`);
}

async function main(): Promise<void> {
  console.log("Transfermarkt Dataset Downloader");
  console.log("================================\n");
  console.log(`Target directory: ${DATA_DIR}\n`);

  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
    console.log("Created data directory.\n");
  }

  for (const file of FILES) {
    await downloadFile(file);
  }

  console.log("\nAll files downloaded successfully.");
}

main().catch((error: unknown) => {
  console.error("\nDownload failed:", error);
  process.exit(1);
});
