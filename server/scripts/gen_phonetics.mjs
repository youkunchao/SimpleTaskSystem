/**
 * 生成英语单词音标与「音标讲解」：CMU 发音词典（ARPAbet）→ 国际音标(IPA) → 中文讲解。
 *
 * 为什么用生成而不是手写：368 个单词手写音标极易出错，CMU 词典是权威发音数据源；
 * 中文讲解则来自下面这张「音素 → 讲解」固定表，保证每个音素的解释一致、不会漂移。
 *
 * 产出：server/src/data/englishPhonetics.generated.js（english -> { ipa, tips }）
 * 运行：node server/scripts/gen_phonetics.mjs（需先 npm i cmu-pronouncing-dictionary）
 */
import { dictionary } from 'cmu-pronouncing-dictionary';
import fs from 'fs';
import { WORDS } from '../src/data/english.generated.js';

// ARPAbet → IPA（不含重音，重音单独处理）
const ARP2IPA = {
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ', B: 'b', CH: 'tʃ', D: 'd',
  DH: 'ð', EH: 'ɛ', ER: 'ɝ', EY: 'eɪ', F: 'f', G: 'ɡ', HH: 'h', IH: 'ɪ', IY: 'i',
  JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ', OW: 'oʊ', OY: 'ɔɪ', P: 'p',
  R: 'ɹ', S: 's', SH: 'ʃ', T: 't', TH: 'θ', UH: 'ʊ', UW: 'u', V: 'v', W: 'w',
  Y: 'j', Z: 'z', ZH: 'ʒ',
};
const VOWELS = new Set(['ɑ', 'æ', 'ʌ', 'ɔ', 'aʊ', 'aɪ', 'ɛ', 'ɝ', 'ɚ', 'eɪ', 'ɪ', 'i', 'oʊ', 'ɔɪ', 'ʊ', 'u', 'ə']);

// 音素 → 一句孩子能听懂的中文提示
const TIPS = {
  i: '长元音，嘴角往两边拉开', ɪ: '短元音，发音短促', ɛ: '短元音，嘴巴半开',
  æ: '短元音，嘴巴要张大', ɑ: '长元音，嘴巴张开舌头放平', ɔ: '长元音，嘴唇收圆',
  ʌ: '短元音，嘴巴放松', ʊ: '短元音，嘴唇微微收圆', u: '长元音，嘴唇收圆',
  ɝ: '长元音，舌头要卷起来', ə: '弱读音，轻轻一带而过', ɚ: '弱读的卷舌音，轻轻带过',
  eɪ: '双元音，从 e 滑到 ɪ', aɪ: '双元音，从 a 滑到 ɪ', ɔɪ: '双元音，从 ɔ 滑到 ɪ',
  oʊ: '双元音，从 o 滑到 ʊ', aʊ: '双元音，从 a 滑到 ʊ',
  p: '清辅音，轻读不送气', b: '浊辅音，声带要振动', t: '清辅音，舌尖顶上齿龈',
  d: '浊辅音，舌尖顶上齿龈并振动', k: '清辅音，舌根顶住上颚', ɡ: '浊辅音，舌根顶住并振动',
  f: '清辅音，上齿轻碰上唇', v: '浊辅音，上齿碰下唇并振动',
  θ: '清辅音，舌尖轻放在齿间', ð: '浊辅音，舌尖在齿间并振动',
  s: '清辅音，像小蛇"嘶嘶"的声音', z: '浊辅音，像蜜蜂"嗡嗡"的声音',
  ʃ: '清辅音，像让人安静时"嘘"的声音', ʒ: '浊辅音，像电视 television 里的 s',
  h: '清辅音，轻轻哈一口气', tʃ: '清辅音，像"吃"的开头', dʒ: '浊辅音，像"知"的开头',
  m: '鼻音，闭上嘴唇发声', n: '鼻音，舌尖顶上齿龈', ŋ: '鼻音，舌根抬起',
  l: '浊辅音，舌尖顶上齿龈', ɹ: '浊辅音，舌头卷起但不碰到上颚', j: '半元音，像"耶"的开头',
  w: '半元音，嘴唇先收圆再放开',
};

// 覆盖表：字母词读「字母名」，CMU 词典没有单字母条目；smoothie/dragonfly 词典缺失
const OVERRIDE_IPA = {
  aa: ['eɪ'], bb: ['b', 'i'], cc: ['s', 'i'], dd: ['d', 'i'], ee: ['i'], ff: ['ɛ', 'f'],
  gg: ['dʒ', 'i'], hh: ['eɪ', 'tʃ'], ii: ['aɪ'], jj: ['dʒ', 'eɪ'], kk: ['k', 'eɪ'],
  ll: ['ɛ', 'l'], mm: ['ɛ', 'm'], nn: ['ɛ', 'n'], oo: ['oʊ'], pp: ['p', 'i'],
  smoothie: ['s', 'm', 'u', 'ð', 'i'],
  dragonfly: ['d', 'ɹ', 'æ', 'ɡ', 'ə', 'n', 'f', 'l', 'aɪ'],
};

// 单个英文单词 → IPA 音素数组（含重音符号）
function wordToIpa(word) {
  if (OVERRIDE_IPA[word]) return OVERRIDE_IPA[word];
  const arp = dictionary[word];
  if (!arp) return null;
  const seq = arp.split(' ').map((raw) => {
    const p = raw.replace(/\d/g, '');
    let sym = ARP2IPA[p];
    if (p === 'AH' && raw.endsWith('0')) sym = 'ə';
    else if (p === 'ER' && raw.endsWith('0')) sym = 'ɚ';
    return { sym, stress: raw.match(/\d/)?.[0] || '' };
  }).filter((x) => x.sym);

  const vowelCount = seq.filter((x) => VOWELS.has(x.sym)).length;
  const at = seq.findIndex((x) => x.stress === '1');
  // 单音节词不标重音（词典惯例）；多音节把 ˈ 放到重读音节开头（辅音丛之前）
  if (vowelCount > 1 && at >= 0) {
    let i = at;
    while (i > 0 && !VOWELS.has(seq[i - 1].sym)) i--;
    seq[i] = { ...seq[i], sym: 'ˈ' + seq[i].sym };
  }
  return seq.map((x) => x.sym);
}

function toIpa(text) {
  const words = String(text)
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
  if (!words.length) return null;
  const parts = [];
  for (const w of words) {
    const p = wordToIpa(w);
    if (!p) return null; // 有单词不在词典里，整体跳过（不产出半截音标）
    parts.push(p); // 保留音素数组，双元音/塞擦音等多字符音素不能被拆开
  }
  return parts;
}

function main() {
  const out = {};
  const missing = [];
  for (const w of WORDS) {
    const parts = toIpa(w.english);
    if (!parts) {
      missing.push(w.english);
      continue;
    }
    const ipa = '/' + parts.map((p) => p.join('')).join(' ') + '/';
    // 音标讲解：取第一个单词里的音素（去重、按出现顺序），最多 3 条
    const firstWord = parts[0];
    const seen = new Set();
    const tips = [];
    for (const s of firstWord) {
      const sym = s.replace('ˈ', '');
      if (!sym || seen.has(sym) || !TIPS[sym]) continue;
      seen.add(sym);
      tips.push({ sym, tip: TIPS[sym] });
      if (tips.length >= 3) break;
    }
    out[w.english] = { ipa, tips };
  }

  const header = `// 自动生成，请勿手改：node server/scripts/gen_phonetics.mjs\n// 数据来源：CMU 发音词典 → IPA；中文讲解来自 gen_phonetics.mjs 里的固定音素表\n`;
  const body = `export const PHONETICS = ${JSON.stringify(out, null, 2)};\n`;
  const outPath = new URL('../src/data/englishPhonetics.generated.js', import.meta.url);
  fs.writeFileSync(outPath, header + body, 'utf8');
  console.log(`已生成 ${Object.keys(out).length} 个单词的音标 -> englishPhonetics.generated.js`);
  if (missing.length) console.log(`词典缺失 ${missing.length} 个：`, missing.slice(0, 40).join(', '));
}

main();
