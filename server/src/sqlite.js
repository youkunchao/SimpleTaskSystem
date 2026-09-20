/**
 * SQLite 驱动适配层
 *
 * 优先使用 better-sqlite3（成熟稳定、性能更好）。
 * 当它的原生二进制在当前运行时不可用时（例如 ARM64 Windows 上运行 x64 Node，
 * 预编译包架构不匹配，且无 Python / C++ 工具链无法本地编译），
 * 自动回退到 Node 22.5+ 内置的 node:sqlite。
 *
 * 两者对外统一暴露 exec / prepare / pragma / close 接口，业务代码无需区分。
 */

// 将 node:sqlite 的 DatabaseSync 包装成 better-sqlite3 风格（主要补上 pragma）
function wrapDatabaseSync(raw) {
  return new Proxy(raw, {
    get(target, prop) {
      if (prop === 'pragma') {
        return (sql) => target.exec(`PRAGMA ${sql}`);
      }
      const value = Reflect.get(target, prop);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

async function loadDriver() {
  try {
    const { default: Database } = await import('better-sqlite3');
    // 真正打开一个内存库，确认原生二进制可加载
    const probe = new Database(':memory:');
    probe.close();
    return (dbPath) => new Database(dbPath);
  } catch (err) {
    const { DatabaseSync } = await import('node:sqlite');
    if (typeof DatabaseSync !== 'function') throw err;
    console.warn(`[sqlite] better-sqlite3 不可用（${err.message}），已回退到 Node 内置 node:sqlite`);
    return (dbPath) => wrapDatabaseSync(new DatabaseSync(dbPath));
  }
}

const create = await loadDriver();

export function createDatabase(dbPath) {
  return create(dbPath);
}

export default createDatabase;
