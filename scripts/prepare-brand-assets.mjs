import sharp from "sharp";
import fs from "fs";
import path from "path";

const fullSrc =
  "C:/Users/Sakhawat Kamran/.cursor/projects/c-wamp64-www-shopbonus/assets/WhatsApp_Image_2026-10-30_at_8.36.49_PM-8763760b-7c6d-4df9-ba9f-348b17dce745.jpg";
const markSrc =
  "C:/Users/Sakhawat Kamran/.cursor/projects/c-wamp64-www-shopbonus/assets/WhatsApp_Image_2026-10-30_at_8.37.24_PM-76759ec6-7ef5-428e-99b2-79108845f5ae.jpg";

const root = process.cwd();

async function removeNearWhite(input, output, threshold = 242) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= threshold && g >= threshold && b >= threshold) data[i + 3] = 0;
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 10 })
    .png()
    .toFile(output);
  return sharp(output).metadata();
}

fs.mkdirSync(path.join(root, "public/brand"), { recursive: true });
fs.mkdirSync(path.join(root, "src/app"), { recursive: true });

const fullOut = path.join(root, "public/brand/logo-full.png");
const markOut = path.join(root, "public/brand/logo-mark.png");

const fullMeta = await removeNearWhite(fullSrc, fullOut);
const markMeta = await removeNearWhite(markSrc, markOut);
console.log("full", fullMeta.width, fullMeta.height);
console.log("mark", markMeta.width, markMeta.height);

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const softBg = { r: 248, g: 250, b: 252, alpha: 1 };

await sharp(markOut).resize(512, 512, { fit: "contain", background: transparent }).png().toFile(path.join(root, "public/brand/icon-512.png"));
await sharp(markOut).resize(192, 192, { fit: "contain", background: transparent }).png().toFile(path.join(root, "public/brand/icon-192.png"));
await sharp(markOut).resize(32, 32, { fit: "contain", background: transparent }).png().toFile(path.join(root, "public/favicon-32.png"));
await sharp(markOut).resize(16, 16, { fit: "contain", background: transparent }).png().toFile(path.join(root, "public/favicon-16.png"));
await sharp(markOut).resize(32, 32, { fit: "contain", background: transparent }).png().toFile(path.join(root, "src/app/icon.png"));
await sharp(markOut).resize(180, 180, { fit: "contain", background: transparent }).png().toFile(path.join(root, "src/app/apple-icon.png"));
await sharp(fullOut).resize(1200, 630, { fit: "contain", background: softBg }).png().toFile(path.join(root, "public/brand/og.png"));
await sharp(markOut).resize(32, 32, { fit: "contain", background: transparent }).toFormat("png").toFile(path.join(root, "public/favicon.ico"));

console.log("done");
