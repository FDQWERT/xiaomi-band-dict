/* 词库与查找逻辑的纯 Node 测试 */
const path = require("path");
const dict = require(path.resolve(__dirname, "..", "src", "common", "dict.js"));

let pass = 0;
let fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log("  ✓ " + label); }
  else { fail++; console.log("  ✗ " + label + (extra !== undefined ? "  → " + JSON.stringify(extra) : "")); }
}
function eq(a, b, label) {
  ok(a === b, label, "期望 " + JSON.stringify(b) + "，实际 " + JSON.stringify(a));
}

console.log("[1] 词库形态");
const total = dict.size();
ok(total > 3000, "词库规模合理", total);
const all = [];
for (let i = 0; i < total; i++) all.push(dict.wordAt(i));
ok(all.every((w) => /^[a-z]+$/.test(w)), "全部是纯小写字母", all.filter((w) => !/^[a-z]+$/.test(w)).slice(0, 5));
ok(all.every((w, i) => i === 0 || all[i - 1] < w), "严格升序且无重复", (() => {
  for (let i = 1; i < all.length; i++) if (!(all[i - 1] < all[i])) return all[i - 1] + " >= " + all[i];
  return "";
})());

console.log("\n[2] 精确命中");
const apple = dict.entry(dict.find("apple"));
ok(apple && apple.word === "apple", "查到 apple", apple && apple.word);
ok(/苹果/.test(apple && apple.def), "apple 的释义是苹果", apple && apple.def);
ok(/ap/.test(apple && apple.phonetic), "带音标", apple && apple.phonetic);
const abandon = dict.entry(dict.find("abandon"));
ok(abandon && /放弃/.test(abandon.def), "abandon 释义正确", abandon && abandon.def);
for (const w of [all[0], all[total - 1], "the", "zoo"]) {
  ok(dict.find(w) >= 0, "首尾与常见词都能查到 " + w);
}

console.log("\n[3] 未命中");
for (const w of ["appl", "zzz", "aaa", "xyzzy", "qqqq"]) {
  const i = dict.find(w);
  ok(i < 0, "没收录 " + w, i);
}
eq(dict.find("appl"), -(all.indexOf("applaud") + 1), "插入点正确（applaud 之前）");

console.log("\n[4] 最接近的词");
ok(dict.wordAt(dict.nearestIndex("appl")) === "applaud", "appl → applaud", dict.wordAt(dict.nearestIndex("appl")));
ok(dict.wordAt(dict.nearestIndex("apple1")) === "apple", "apple1 → apple", dict.wordAt(dict.nearestIndex("apple1")));
ok(dict.wordAt(dict.nearestIndex("aaa")) === all[0], "比首词还小 → 首词", dict.wordAt(dict.nearestIndex("aaa")));
ok(dict.wordAt(dict.nearestIndex("zzzz")) === all[total - 1], "比尾词还大 → 尾词", dict.wordAt(dict.nearestIndex("zzzz")));

console.log("\n[5] 二分与线性扫描结果一致");
let mismatch = 0;
for (let i = 0; i < 400; i++) {
  const probe = all[(i * 97) % total];
  // 命中：下标必须与线性扫描一致
  if (dict.find(probe) !== all.indexOf(probe)) mismatch++;
  // 未命中：返回的插入点必须真的夹住该词（all[low-1] < w < all[low]）
  const near = probe.slice(0, Math.max(1, probe.length - 1)) + "z";
  const pos = dict.find(near);
  if (pos >= 0) {
    if (all[pos] !== near) mismatch++;
  } else {
    const low = -pos - 1;
    if (low > 0 && !(all[low - 1] < near)) mismatch++;
    if (low < total && !(near < all[low])) mismatch++;
  }
}
for (const w of ["a", "ab", "abc", "zz", "zzz", "app", "apply", "apples"]) {
  const byBinary = dict.find(w);
  const byLinear = all.indexOf(w);
  if (byLinear >= 0 ? byBinary !== byLinear : byBinary >= 0) mismatch++;
}
eq(mismatch, 0, "400 次随机探针 + 边界词，二分 = 线性");

console.log("\n[6] 边界与异常输入");
eq(dict.find(""), -1, "空串未命中");
ok(dict.find("APPLE") < 0, "大写不算命中（词库只有小写）", dict.find("APPLE"));
ok(dict.find("Apple") < 0, "首字母大写也不算命中");
ok(dict.find("app le") < 0, "带空格不算命中");
ok(dict.entry(-1) === null, "下标越界返回 null");
ok(dict.entry(total) === null, "上界越界返回 null");
eq(dict.wordAt(-3), "", "越界词取空串");

console.log("\n[7] 性能：一次查询耗时可忽略");
const t0 = process.hrtime.bigint();
for (let i = 0; i < 20000; i++) dict.find(all[(i * 131) % total]);
const perLookup = Number(process.hrtime.bigint() - t0) / 20000 / 1000;
ok(perLookup < 60, "单次查询 < 60µs", perLookup.toFixed(2) + "µs");
ok(perLookup < 10, "单次查询 < 10µs（二分，无字符串切分）", perLookup.toFixed(2) + "µs");

console.log("\n结果: " + pass + " 通过, " + fail + " 失败");
process.exit(fail ? 1 : 0);
