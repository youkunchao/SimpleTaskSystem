// 统一时间工具
//
// SQLite 的 datetime('now') 返回 UTC 时间，而 JS 的 new Date() 是本地时区，
// 两者混用会让「按天统计」「连续打卡」在中国时区（UTC+8）出现跨天错位：
// 例如本地 9/19 07:00 学习，UTC 还是 9/18，打卡日期被记成前一天。
//
// 本项目为单时区应用，统一以服务器本地时间存储，格式统一为 'YYYY-MM-DD HH:MM:SS'，
// 这样字符串比较（next_review <= now）与 date() 切分都按本地时间进行。

const pad = (n) => String(n).padStart(2, '0');

/** 当前本地时间：'YYYY-MM-DD HH:MM:SS' */
export function nowLocal(from = new Date()) {
  const d = from;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 当前本地日期：'YYYY-MM-DD' */
export function todayLocal(from = new Date()) {
  const d = from;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 在本地时间基准上加减天数：'YYYY-MM-DD HH:MM:SS' */
export function addDaysLocal(days, from = new Date()) {
  return nowLocal(new Date(from.getTime() + days * 24 * 60 * 60 * 1000));
}

/** 服务器本地时区相对 UTC 的偏移分钟数（中国为 480） */
export function utcOffsetMinutes() {
  return -new Date().getTimezoneOffset();
}
