import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// sharp ya viene con Next; reproduce los iconos desde la identidad existente.
const source = await fs.readFile(new URL("../src/app/icon.svg", import.meta.url));
const directory = new URL("../public/icons/", import.meta.url);
await fs.mkdir(directory, { recursive: true });
for (const size of [192, 512]) {
  await sharp(source).resize(size, size).png().toFile(fileURLToPath(new URL(`icon-${size}.png`, directory)));
}
const mark = await sharp(source).resize(320, 320).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#1f4a34" } })
  .composite([{ input: mark, gravity: "centre" }]).png()
  .toFile(fileURLToPath(new URL("maskable-512.png", directory)));
