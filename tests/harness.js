// Minimal browser smoke-test harness. Uses playwright-core + an installed Chrome/Chromium.
// Set CHROME_PATH if Chrome isn't auto-detected.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
function findChrome() {
  const c = [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  return c.find((p) => p && fs.existsSync(p));
}
async function run(name, fn, { port = 8799 } = {}) {
  let chromium;
  try { ({ chromium } = require("playwright-core")); } catch (e) { console.log("SKIP: run `npm install` first (needs playwright-core)"); process.exit(0); }
  const exe = findChrome();
  if (!exe) { console.log("SKIP: no Chrome/Chromium found; set CHROME_PATH"); process.exit(0); }
  const server = spawn(process.execPath, [path.join(__dirname, "..", "scripts", "serve.js"), String(port)], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 400));
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let ok = true;
  try {
    await fn(page, `http://localhost:${port}`, (cond, msg) => { if (!cond) throw new Error("Assertion failed: " + msg); console.log("  ✓ " + msg); });
    if (errors.length) throw new Error("Page errors: " + errors.join("; "));
    console.log(`PASS ${name}`);
  } catch (e) { ok = false; console.error(`FAIL ${name}: ${e.message}`); }
  await browser.close(); server.kill();
  process.exit(ok ? 0 : 1);
}
module.exports = { run };
