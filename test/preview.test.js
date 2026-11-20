/* 用 jsdom 跑 preview.html：真的点虚拟键盘，验证查找/回退/清空 */
const fs = require("fs");
const path = require("path");
let JSDOM;
try { JSDOM = require("jsdom").JSDOM; } catch (e) { JSDOM = require("/tmp/domtest/node_modules/jsdom").JSDOM; }

const html = fs.readFileSync(path.resolve(__dirname, "..", "preview", "preview.html"), "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/preview.html" });
const { window } = dom;
const doc = window.document;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log("  ✓ " + label); }
  else { fail++; console.log("  ✗ " + label + (extra !== undefined ? "  → " + JSON.stringify(extra).slice(0, 200) : "")); }
}

const sleepAll = () => sleep(40);

(async () => {
  window.addEventListener("error", (e) => console.log("  ! window error:", e.message));
  await sleep(300);

  const screen = doc.getElementById("screen");
  const txt = () => screen.textContent.replace(/\s+/g, " ").trim();
  const keys = () => [...screen.querySelectorAll(".key")];
  const keyOf = (ch) => keys().find((k) => k.textContent.trim() === ch);
  const fnBtn = (label) => [...screen.querySelectorAll(".fn")].find((k) => k.textContent.trim() === label);
  const type = async (word) => {
    for (const ch of word) { click(keyOf(ch)); await sleepAll(); }
  };

  console.log("\n[1] 初始界面");
  ok(screen.children.length > 0, "渲染出内容");
  ok(/查单词/.test(txt()), "标题为查单词", txt().slice(0, 40));
  const idle = txt();
  ok(/输入小写字母/.test(idle), "输入框占位提示", idle.slice(0, 60));
  ok(/输入字母开始查/.test(idle), "空状态提示");
  ok(/只收纯小写单词/.test(idle), "说明只收小写");
  ok(/3500\+六级 · \d+ 条/.test(idle), "标题栏显示词表来源与词条数", idle.slice(0, 80));

  console.log("\n[2] 键盘：字母顺序 a→z、一排 5 个、可上下滑");
  ok(keys().length === 26, "26 个字母键", keys().length);
  const letters = keys().map((k) => k.textContent.trim()).join("");
  ok(letters === "abcdefghijklmnopqrstuvwxyz", "按字母顺序 a→z", letters);
  ok(!/[A-Z]/.test(letters), "没有任何大写键");
  const rows = [...screen.querySelectorAll(".kb-row")];
  ok(rows.length === 6, "6 行（26 个字母按一排 5 个分）", rows.length);
  const perRow = rows.map((r) => r.querySelectorAll(".key").length);
  ok(perRow.join(",") === "5,5,5,5,5,1", "每行字母数 5/5/5/5/5/1", perRow.join(","));
  ok(perRow.reduce((a, b) => a + b, 0) === 26, "6 行合计 26 个键", perRow.join(","));
  ok(/^abcde$/.test(rows[0].textContent.replace(/\s/g, "")), "第一行是 abcde", rows[0].textContent.trim());
  ok(!!fnBtn("删除") && !!fnBtn("清空"), "有删除与清空键");
  const fnRow = screen.querySelector(".fn-row");
  ok(!!fnRow && fnRow.querySelectorAll(".fn").length === 2, "删除/清空在独立的功能行里");
  const css = html;
  ok(/\.key \{[^}]*width: 58px;[^}]*height: 56px;/s.test(css), "键位 58×56（一排 5 个，按得准）");
  ok(/\.kb \{[^}]*height: 200px;/s.test(css), "键盘可视 200px，6 行要上下滑");

  console.log("\n[3] 逐字母查到 apple");
  click(keyOf("a")); await sleepAll();
  ok(/^a/.test(txt().replace(/^查单词[^a-z]*/, "")), "输入回显 a", txt().slice(0, 60));
  await type("pple");
  const inputText = screen.querySelector(".input-text").textContent.trim();
  ok(inputText === "apple", "输入串为 apple", inputText);
  const word = screen.querySelector(".word");
  ok(word && word.textContent.trim() === "apple", "结果词为 apple", word && word.textContent);
  const phon = screen.querySelector(".phon");
  ok(!!phon && /\/.+\//.test(phon.textContent), "显示音标", phon && phon.textContent);
  const def = screen.querySelector(".def");
  ok(!!def && /苹果/.test(def.textContent), "显示释义", def && def.textContent);

  console.log("\n[4] 查 abandon / zoo");
  click(fnBtn("清空")); await sleepAll();
  await type("zoo");
  ok(screen.querySelector(".word").textContent.trim() === "zoo", "zoo 命中");
  ok(/动物园/.test(screen.querySelector(".def").textContent), "zoo 释义正确");

  console.log("\n[5] 删除键逐字退格");
  click(fnBtn("清空")); await sleepAll();
  await type("apple");
  click(fnBtn("删除")); await sleepAll();
  ok(screen.querySelector(".input-text").textContent.trim() === "appl", "退格变成 appl");
  ok(!screen.querySelector(".word"), "未命中时没有结果词条");
  ok(/没收录这个词/.test(txt()), "提示没收录");
  const miss = screen.querySelector(".miss-s");
  ok(!!miss && /applaud/.test(miss.textContent), "给出最接近的词", miss && miss.textContent);
  const jump = screen.querySelector(".jump");
  ok(!!jump, "有跳转按钮");
  click(jump); await sleepAll();
  ok(screen.querySelector(".input-text").textContent.trim() === "applaud", "点跳转后输入串变成 applaud");
  ok(screen.querySelector(".word").textContent.trim() === "applaud", "并显示 applaud 的词条");

  console.log("\n[6] 清空回到初始态");
  click(fnBtn("清空")); await sleepAll();
  ok(!screen.querySelector(".input-text"), "输入回显消失");
  ok(/输入字母开始查/.test(txt()), "回到空状态");

  console.log("\n[7] 输入不存在的词");
  click(fnBtn("清空")); await sleepAll();
  await type("zzzz");
  ok(/没收录这个词/.test(txt()), "长串也提示没收录");
  ok(!!screen.querySelector(".jump"), "仍给最接近的词");

  console.log("\n[8] 连续输入 24 个字母上限");
  click(fnBtn("清空")); await sleepAll();
  await type("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  ok(screen.querySelector(".input-text").textContent.trim().length === 24, "输入截断在 24 个字母", screen.querySelector(".input-text").textContent.trim().length);

  console.log("\n结果: " + pass + " 通过, " + fail + " 失败");
  process.exit(fail ? 1 : 0);
})();
