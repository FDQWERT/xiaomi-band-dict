/*
 * 查词核心：数据是一整条按字母升序的字符串（word|音标|释义|其他形式 一行一条）。
 *
 * 性能相关的几点，都放在模块作用域里，不进组件的 private：
 *  - 词条字符串只在第一次查询时 split 一次，之后复用（3613 行，约 150KB，一次性成本）
 *  - 再额外抽出「单词」数组，二分时只比单词、不再每步切字符串
 *  - 精确查找走二分，3613 词最多 12 次比较；键长不计，逐字母输入也不会卡
 */
const RAW = require("./worddata.js")

let lines = null
let keys = null
let count = 0

function ensure() {
  if (lines) return
  lines = RAW.split("\n")
  keys = new Array(lines.length)
  for (let i = 0; i < lines.length; i++) {
    const bar = lines[i].indexOf("|")
    keys[i] = bar < 0 ? lines[i] : lines[i].slice(0, bar)
  }
  count = lines.length
}

function size() {
  ensure()
  return count
}

// 命中返回下标；未命中返回 -(插入点 + 1)，与 Array#binarySearch 的约定一致
function find(word) {
  ensure()
  let lo = 0
  let hi = count - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const k = keys[mid]
    if (k === word) return mid
    if (k < word) lo = mid + 1
    else hi = mid - 1
  }
  return -(lo + 1)
}

function entry(index) {
  ensure()
  if (!(index >= 0 && index < count)) return null
  const cells = lines[index].split("|")
  return {
    word: cells[0],
    phonetic: cells[1] || "",
    def: cells[2] || "",
    note: cells[3] || "",
    index: index
  }
}

function commonPrefix(a, b) {
  const n = Math.min(a.length, b.length)
  let i = 0
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i += 1
  return i
}

// 没命中时给最像的一个词：取插入点前后两个候选，公共前缀更长的优先
function nearestIndex(word) {
  ensure()
  const pos = find(word)
  if (pos >= 0) return pos
  const low = -pos - 1
  const left = low - 1
  const right = low
  if (left < 0) return right < count ? right : -1
  if (right >= count) return left
  const pl = commonPrefix(word, keys[left])
  const pr = commonPrefix(word, keys[right])
  if (pl !== pr) return pr > pl ? right : left
  // 前缀一样长时取更短的词：输入 "aaa" 时 "a" 比 "abandon" 更像用户想查的
  if (keys[left].length !== keys[right].length) return keys[left].length < keys[right].length ? left : right
  return left
}

function wordAt(index) {
  ensure()
  return index >= 0 && index < count ? keys[index] : ""
}

module.exports = {
  size: size,
  find: find,
  entry: entry,
  nearestIndex: nearestIndex,
  wordAt: wordAt
}
