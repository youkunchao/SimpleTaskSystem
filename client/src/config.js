// 运行期 API 基址（唯一事实源）
// 默认同源 '/api'（本地开发 / 同源部署）。
// 打包成 App 或部署到独立域名时，通过 Vite 构建变量 VITE_API_BASE_URL 指定后端地址。
// 注意：后端接口统一挂在 /api 路径下，因此完整基址应包含该前缀，
// 例如 https://api.hldbrush.com/api
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
