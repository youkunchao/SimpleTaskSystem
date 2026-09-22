// 触发 db.js 的迁移（幂等，仅执行未记录的迁移），用于在不重启服务的情况下应用数据修正。
import db from '../src/db.js';
const n = db.prepare('SELECT COUNT(*) c FROM characters WHERE hanzi IN (\'流\',\'朋\',\'孩\',\'亲\',\'民\',\'兵\') AND emoji IN (\'💧\',\'👫\',\'👧\',\'👪\',\'👥\',\'🪖\')').get().c;
const w = db.prepare('SELECT COUNT(*) c FROM characters WHERE hanzi IN (\'预\',\'随\') AND words LIKE \'%预习%\' AND words LIKE \'%随便%\'').get().c;
console.log(`已修正 emoji 字 ${n}/6，组词 预/随 ${w}/2`);
process.exit(0);
