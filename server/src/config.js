/**
 * 运行配置与安全校验（启动即校验，避免"带着不安全的默认配置上线"）
 *
 * 安全要求：
 *  - 生产环境必须显式配置 JWT_SECRET，否则直接拒绝启动（不给出任何可用默认值）；
 *  - 开发环境也不再使用源码里的固定常量密钥，改为"本地文件持久化的随机密钥"，
 *    既保证重启后登录态不丢，又不会出现任何人都能查到的已知密钥。
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
// 开发环境密钥落盘位置（仅本机，不入库）
const DEV_SECRET_FILE = join(DATA_DIR, '.dev-jwt-secret');

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const isProd = NODE_ENV === 'production';

function fail(message) {
  console.error(`\n❌ 启动失败：${message}\n`);
  process.exit(1);
}

function resolveJwtSecret() {
  const fromEnv = (process.env.JWT_SECRET || '').trim();

  if (fromEnv) {
    // 生产环境额外校验强度，避免随手填一个弱密钥
    if (isProd && fromEnv.length < 32) {
      fail('JWT_SECRET 强度不足（生产环境要求至少 32 位随机字符串）');
    }
    return fromEnv;
  }

  if (isProd) {
    fail('生产环境必须设置 JWT_SECRET 环境变量，且不可使用内置默认密钥（否则任何人都能伪造登录凭证）');
  }

  // 开发环境：读取/生成本机随机密钥并持久化，重启后登录态保持
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DEV_SECRET_FILE)) {
      const saved = fs.readFileSync(DEV_SECRET_FILE, 'utf8').trim();
      if (saved.length >= 32) return saved;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(DEV_SECRET_FILE, generated, { mode: 0o600 });
    console.warn('⚠️  未设置 JWT_SECRET：已在本机生成随机开发密钥（data/.dev-jwt-secret），生产环境必须显式配置');
    return generated;
  } catch (e) {
    // 极少数情况下无法落盘（只读目录等），退化为一次性随机密钥
    console.warn(`⚠️  未设置 JWT_SECRET，且无法持久化开发密钥（${e.message}），本次使用一次性随机密钥`);
    return crypto.randomBytes(32).toString('hex');
  }
}

export const JWT_SECRET = resolveJwtSecret();
export const PORT = Number(process.env.PORT || 3001);

// 其他启动期必填项集中在此，便于上线前自查
export function assertProductionConfig() {
  if (!isProd) return;
  if (!process.env.JWT_SECRET) fail('生产环境缺少 JWT_SECRET');
  if (!process.env.CORS_ORIGIN) {
    console.warn('⚠️  生产环境未设置 CORS_ORIGIN，当前仅允许 localhost 访问，外部请求会被 403 拒绝');
  }
}
