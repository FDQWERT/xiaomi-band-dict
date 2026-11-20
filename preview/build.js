const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "preview", "preview.html");
const PAGES = ["index"];

const read = (p) => fs.readFileSync(p, "utf8");

function section(text, tag) {
  const m = text.match(new RegExp("<" + tag + ">([\\s\\S]*?)</" + tag + ">"));
  return m ? m[1] : "";
}

function scopeCss(css, prefix) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/([^{}]+)\{([^{}]*)\}/g, (m, sels, body) => {
      const list = sels
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => prefix + " " + s)
        .join(", ");
      return list + " {" + body + "}";
    });
}

function transformScript(body) {
  return body
    .replace(/^\s*import\s+(\w+)\s+from\s+["']([^"']+)["'];?/gm, 'const $1 = require("$2");')
    .replace(/export\s+default\s*\{/, "return {");
}

const templates = [];
const styles = [];
const scripts = [];

for (const name of PAGES) {
  const text = read(path.join(SRC, "pages", name, name + ".ux"));
  templates.push(`<template id="tpl-${name}">${section(text, "template").trim()}</template>`);
  styles.push(`<style>${scopeCss(section(text, "style"), '#screen[data-page="' + name + '"]')}</style>`);
  scripts.push(`window.__pages.${name} = (function () {${transformScript(section(text, "script"))}\n})();`);
}

const dict = read(path.join(SRC, "common", "dict.js"));
const worddata = read(path.join(SRC, "common", "worddata.js"));
const runtime = read(path.join(ROOT, "preview", "runtime.js"));

const base = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #08090a; color: #e6edf3;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans SC", sans-serif; }
body { display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 26px 14px 40px; }
.hint { font-size: 12px; color: #6e7681; margin-bottom: 16px; letter-spacing: .3px; }
#screen { position: relative; width: 336px; height: 480px; overflow: hidden; background: #000;
  border-radius: 26px; box-shadow: 0 0 0 8px #171b1f, 0 24px 50px rgba(0, 0, 0, .65); color: #fff; }
#screen div, #screen scroll, #screen list, #screen stack, #screen list-item {
  display: flex; flex-direction: column; position: relative; }
#screen span { display: block; }
#screen img { display: block; }
`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>查单词 · 小米手环 8 Pro 预览</title>
<style>${base}</style>
${styles.join("\n")}
</head>
<body>
<div class="hint">336 × 480 · 小米手环 8 Pro 预览（点键盘打字）</div>
<div id="screen"></div>
${templates.join("\n")}
<script>${runtime}</script>
<script>
window.__pages = {};
window.__def("worddata", function (module, exports) {${worddata}
});
window.__def("dict", function (module, exports) {${dict}
});
${scripts.join("\n")}
window.__boot("index");
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log("wrote", OUT, (html.length / 1024).toFixed(0) + "KB");
