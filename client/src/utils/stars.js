// 全局星星奖励 store（v3.0 奖励体系）
// 累计保存，右上角展示；各页面按规则调用 addStars。
const KEY = 'kid_stars_total';

let count = Number(localStorage.getItem(KEY) || 0);
if (!Number.isFinite(count) || count < 0) count = 0;

const subscribers = new Set();

export function getStars() {
  return count;
}

export function addStars(n = 1) {
  if (n <= 0) return;
  count += n;
  try { localStorage.setItem(KEY, String(count)); } catch {}
  subscribers.forEach((fn) => fn(count));
}

export function subscribeStars(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
