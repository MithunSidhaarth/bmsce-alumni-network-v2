// A very small headless-Chrome driver for end-to-end checks, speaking the
// DevTools protocol directly (no dependencies; Node 22 has WebSocket built in).
//
//   const b = await launch();
//   const page = await b.page({ mobile: true });
//   await page.goto("http://localhost:3210/");
//   await page.eval("document.title");
//   await page.shot("home.jpg");
//   await b.close();
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch() {
  const exe = CANDIDATES.find((p) => fs.existsSync(p));
  if (!exe) throw new Error("No Chrome found. Set CHROME_PATH.");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "bmsce-e2e-"));
  const proc = spawn(
    exe,
    ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--mute-audio", "--window-size=1280,800", "about:blank"],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => reject(new Error("Chrome did not start")), 20000);
    proc.stderr.on("data", (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    });
    proc.on("exit", () => reject(new Error("Chrome exited early")));
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error("Could not connect to Chrome"));
  });
  let seq = 0;
  const waiting = new Map();
  const listeners = new Set();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message}`));
      else resolve(msg.result);
    } else if (msg.method) {
      listeners.forEach((l) => l(msg));
    }
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      waiting.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

  async function page({ mobile = false, width = mobile ? 390 : 1280, height = mobile ? 844 : 800 } = {}) {
    // Each page gets its own cookie jar, so two pages can be two different people.
    const { browserContextId } = await send("Target.createBrowserContext");
    const { targetId } = await send("Target.createTarget", { url: "about:blank", browserContextId });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const cmd = (method, params) => send(method, params, sessionId);
    const errors = [];
    listeners.add((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
      if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
        errors.push(msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 400));
      }
    });
    await cmd("Page.enable");
    await cmd("Runtime.enable");
    await cmd("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
    if (mobile) {
      await cmd("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
      await cmd("Emulation.setUserAgentOverride", {
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
      });
    }

    const evaluate = async (expression) => {
      const res = await cmd("Runtime.evaluate", { expression: `(async () => { ${expression.includes("return") ? expression : `return (${expression})`} })()`, awaitPromise: true, returnByValue: true });
      if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
      return res.result.value;
    };
    const waitFor = async (expression, timeout = 15000) => {
      const start = Date.now();
      for (;;) {
        // Coerced to a boolean in the page: DOM nodes cannot be returned by value.
        const value = await evaluate(expression.includes("return") ? expression : `!!(${expression})`).catch(() => null);
        if (value) return value;
        if (Date.now() - start > timeout) throw new Error(`Timed out waiting for: ${expression.slice(0, 120)}`);
        await sleep(150);
      }
    };
    const centre = async (selector) => {
      const box = await evaluate(
        `const el = ${selector.startsWith("js:") ? selector.slice(3) : `document.querySelector(${JSON.stringify(selector)})`}; if (!el) return null; el.scrollIntoView({ block: "center", inline: "center" }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };`
      );
      if (!box) throw new Error(`No element for ${selector}`);
      return box;
    };

    return {
      errors,
      cmd,
      eval: evaluate,
      waitFor,
      sleep,
      async goto(url, settle = 600) {
        const loaded = new Promise((resolve) => {
          const l = (msg) => {
            if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") {
              listeners.delete(l);
              resolve();
            }
          };
          listeners.add(l);
          setTimeout(resolve, 30000);
        });
        await cmd("Page.navigate", { url });
        await loaded;
        await sleep(settle);
      },
      /** A real mouse click (or tap) in the middle of the element. Selector, or "js:<expression returning an element>". */
      async click(selector) {
        const { x, y } = await centre(selector);
        if (mobile) {
          await cmd("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
          await cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        } else {
          await cmd("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
          await cmd("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
          await cmd("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
        }
        await sleep(120);
      },
      async drag(selector, dx, dy, steps = 12) {
        const { x, y } = await centre(selector);
        await cmd("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
        await cmd("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
        for (let i = 1; i <= steps; i++) {
          await cmd("Input.dispatchMouseEvent", { type: "mouseMoved", x: x + (dx * i) / steps, y: y + (dy * i) / steps, button: "left", buttons: 1 });
          await sleep(16);
        }
        await cmd("Input.dispatchMouseEvent", { type: "mouseReleased", x: x + dx, y: y + dy, button: "left", clickCount: 1 });
        await sleep(150);
      },
      async type(text) {
        for (const ch of text) await cmd("Input.insertText", { text: ch });
        await sleep(80);
      },
      async key(key, modifiers = 0) {
        const codes = { Enter: 13, Escape: 27, Tab: 9, ArrowDown: 40, ArrowUp: 38, k: 75 };
        const base = { key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, windowsVirtualKeyCode: codes[key] ?? 0, modifiers };
        await cmd("Input.dispatchKeyEvent", { type: "keyDown", ...base, ...(key === "Enter" ? { text: "\r" } : {}) });
        await cmd("Input.dispatchKeyEvent", { type: "keyUp", ...base });
        await sleep(100);
      },
      async scrollTo(y) {
        await evaluate(`window.scrollTo(0, ${y}); return true`);
        await sleep(350);
      },
      /** JPEG screenshot of the viewport, at half size by default to keep files small. */
      async shot(file, { scale = 0.5 } = {}) {
        const { data } = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 60, clip: { x: 0, y: 0, width, height, scale } });
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.from(data, "base64"));
        return file;
      },
      async close() {
        await send("Target.closeTarget", { targetId }).catch(() => {});
      },
    };
  }

  return {
    page,
    async close() {
      try {
        await send("Browser.close");
      } catch {}
      proc.kill();
      await sleep(300);
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
    },
  };
}

/** Sign in through the real form with a test account from .env.local. */
export async function signIn(page, base, email, password) {
  await page.goto(`${base}/login`);
  // Wait until React has attached to the button, or the click does nothing.
  await page.waitFor(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("email and password") && Object.keys(b).some((k) => k.startsWith("__react")))`, 30000);
  await page.click(`js:[...document.querySelectorAll("button")].find((b) => b.innerText.includes("email and password"))`);
  await page.waitFor(`document.querySelector('input[type=password]')`);
  await page.click('input[type=email][placeholder="Email"]');
  await page.type(email);
  await page.click("input[type=password]");
  await page.type(password);
  await page.key("Enter");
  await page.waitFor(`document.documentElement.dataset.auth === "in" || location.pathname === "/onboarding"`, 25000);
}

export function readEnv(file = ".env.local") {
  return Object.fromEntries(
    fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
  );
}
