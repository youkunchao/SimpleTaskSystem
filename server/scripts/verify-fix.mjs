import db from '../src/db.js';
const rows = db.prepare("SELECT hanzi, words, emoji FROM characters WHERE hanzi IN ('预','随','流','朋','孩','民','兵')").all();
for (const r of rows) console.log(`${r.hanzi} | words=${r.words} | emoji=${r.emoji}`);
process.exit(0);
