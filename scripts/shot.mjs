// Screenshot (and optionally click through) a page with headless Chrome over CDP.
// usage: node scripts/shot.mjs <url> <out.png> [waitMs] [step ...]
// A step is either "x,y@delayMs" (a click) or "js:<expression>@delayMs".
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [url, out, waitArg, ...clicks] = process.argv.slice(2);
const wait = Number(waitArg ?? 6000);
const port = 9400 + Math.floor(Math.random() * 400);

const chrome = spawn(CHROME, [
	"--headless=new",
	"--disable-gpu",
	"--enable-unsafe-swiftshader",
	"--hide-scrollbars",
	"--window-size=1440,900",
	"--force-device-scale-factor=1",
	`--remote-debugging-port=${port}`,
	"--user-data-dir=/tmp/mj-chrome-profile",
	"about:blank",
]);
chrome.stderr.on("data", () => {});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
	for (let attempt = 0; attempt < 60; attempt++) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/json/list`);
			const list = await res.json();
			const page = list.find((t) => t.type === "page");
			if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
		} catch {}
		await sleep(250);
	}
	throw new Error("no debugger target");
}

const ws = new WebSocket(await target());
let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
	const message = JSON.parse(event.data);
	const resolve = pending.get(message.id);
	if (resolve) {
		pending.delete(message.id);
		resolve(message.result);
	}
});
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

const send = (method, params = {}) =>
	new Promise((resolve) => {
		const next = ++id;
		pending.set(next, resolve);
		ws.send(JSON.stringify({ id: next, method, params }));
	});

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url });
await sleep(wait);

for (const step of clicks) {
	const at = step.lastIndexOf("@");
	const body = at > 0 ? step.slice(0, at) : step;
	const delay = at > 0 ? Number(step.slice(at + 1)) : 1500;

	if (body.startsWith("js:")) {
		const result = await send("Runtime.evaluate", {
			expression: body.slice(3),
			returnByValue: true,
			awaitPromise: true,
		});
		if (result?.exceptionDetails) console.error("eval failed:", result.exceptionDetails.text);
	} else {
		const [x, y] = body.split(",").map(Number);
		for (const type of ["mousePressed", "mouseReleased"]) {
			await send("Input.dispatchMouseEvent", {
				type,
				x,
				y,
				button: "left",
				clickCount: 1,
			});
		}
	}
	await sleep(delay);
}

const shot = await send("Page.captureScreenshot", { format: "png" });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(shot.data, "base64"));

const logs = await send("Runtime.evaluate", {
	expression: "JSON.stringify(window.__errors ?? [])",
	returnByValue: true,
});
console.log(`wrote ${out}`, logs.result?.value ?? "");
ws.close();
chrome.kill();
process.exit(0);
