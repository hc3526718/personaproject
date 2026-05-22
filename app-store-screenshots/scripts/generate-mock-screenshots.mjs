/**
 * Generates dark + gold mock in-app screens for the screenshot editor.
 * Run: node scripts/generate-mock-screenshots.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const W = 1170;
const H = 2532;

const screens = [
  {
    id: "01",
    nav: "Community",
    title: "Athlete feed",
    rows: [
      { user: "@jordan.m", msg: "Who's training this weekend?", tag: "#football" },
      { user: "@samira.k", msg: "Recovery tips after match day", tag: "#support" },
      { user: "@leo.p", msg: "Looking for a sprint partner", tag: "#network" },
    ],
  },
  {
    id: "02",
    nav: "Messages",
    title: "Direct support",
    rows: [
      { user: "Maya · Basketball", msg: "Happy to share my warm-up routine", tag: "Reply" },
      { user: "Chris · Rugby", msg: "Can review your clip tonight", tag: "Reply" },
      { user: "Dalton Team", msg: "Welcome to the community", tag: "Pinned" },
    ],
  },
  {
    id: "03",
    nav: "Coaching",
    title: "Verified feedback",
    rows: [
      { user: "Coach Ellis", msg: "Focus on hip mobility this block", tag: "Insight" },
      { user: "Coach Park", msg: "Strong progress on pacing drills", tag: "Insight" },
      { user: "Your plan", msg: "3 priorities for next session", tag: "Summary" },
    ],
  },
  {
    id: "04",
    nav: "Events",
    title: "Dalton events",
    rows: [
      { user: "London · 12 Jun", msg: "Industry meet-up & open training", tag: "Book" },
      { user: "Manchester · 28 Jun", msg: "Talent showcase evening", tag: "Book" },
      { user: "Virtual · Weekly", msg: "Coach Q&A live session", tag: "Join" },
    ],
  },
  {
    id: "05",
    nav: "Sponsors",
    title: "Partner spotlight",
    rows: [
      { user: "Elite Nutrition", msg: "Athlete partnership slots open", tag: "Featured" },
      { user: "Pro Gear Co", msg: "Community collab opportunities", tag: "Featured" },
      { user: "Your brand", msg: "Submit a sponsor proposal", tag: "Apply" },
    ],
  },
  {
    id: "06",
    nav: "Media",
    title: "Submit content",
    rows: [
      { user: "Training film", msg: "Upload session highlights", tag: "Proposal" },
      { user: "Podcast episode", msg: "Pitch an interview series", tag: "Proposal" },
      { user: "Master review", msg: "Dalton approves before publish", tag: "Status" },
    ],
  },
];

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function screenSvg(screen) {
  const rowSvg = screen.rows
    .map((r, i) => {
      const y = 520 + i * 340;
      return `
      <rect x="72" y="${y}" width="1026" height="280" rx="28" fill="#1C1C1C" stroke="rgba(200,168,75,0.22)" stroke-width="2"/>
      <circle cx="130" cy="${y + 70}" r="36" fill="rgba(200,168,75,0.15)" stroke="#C8A84B" stroke-width="2"/>
      <text x="190" y="${y + 58}" fill="#D4D0C8" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">${esc(r.user)}</text>
      <text x="190" y="${y + 108}" fill="#9A9690" font-family="Arial, Helvetica, sans-serif" font-size="28">${esc(r.msg)}</text>
      <rect x="900" y="${y + 200}" width="160" height="52" rx="26" fill="rgba(200,168,75,0.12)" stroke="#C8A84B" stroke-width="1.5"/>
      <text x="930" y="${y + 235}" fill="#C8A84B" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="600">${esc(r.tag)}</text>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="85%" cy="8%" r="45%">
      <stop offset="0%" stop-color="#C8A84B" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#C8A84B" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="#0A0A0A"/>
  <circle cx="980" cy="180" r="220" fill="url(#glow)"/>
  <circle cx="140" cy="2200" r="160" fill="rgba(200,168,75,0.08)"/>
  <rect x="0" y="0" width="${W}" height="120" fill="#141414"/>
  <text x="72" y="78" fill="#C8A84B" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="3">DALTON ACCESS</text>
  <text x="72" y="260" fill="#D4D0C8" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700">${esc(screen.title)}</text>
  <text x="72" y="330" fill="#9A9690" font-family="Arial, Helvetica, sans-serif" font-size="30">${esc(screen.nav)}</text>
  <rect x="72" y="380" width="220" height="56" rx="28" fill="rgba(200,168,75,0.15)" stroke="#C8A84B" stroke-width="1.5"/>
  <text x="102" y="418" fill="#C8A84B" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="600">Premium</text>
  ${rowSvg}
</svg>`;
}

async function writePng(outDir, screen) {
  const svg = Buffer.from(screenSvg(screen));
  const out = path.join(outDir, `${screen.id}.png`);
  await sharp(svg).png().toFile(out);
  console.log("wrote", out);
}

const targets = [
  path.join(root, "public", "screenshots", "apple", "iphone", "en"),
  path.join(root, "public", "screenshots", "android", "phone", "en"),
];

for (const dir of targets) {
  fs.mkdirSync(dir, { recursive: true });
  for (const screen of screens) {
    await writePng(dir, screen);
  }
}
