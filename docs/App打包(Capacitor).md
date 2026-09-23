# 启蒙星 App 打包文档（Capacitor）

本文说明如何把「启蒙星」前端（React/Vite）打包成 **Android / iOS 原生 App**。后端作为独立云服务部署在 `https://api.hldbrush.com`（接口挂在 `/api` 下），App 通过 HTTPS 调用，**后端不在手机内运行**。

---

## 一、已完成的工程改动（可直接打包）

| 改动 | 说明 |
|---|---|
| `client/src/config.js` | 新增 `API_BASE`：默认同源 `/api`，可用 `VITE_API_BASE_URL` 覆盖 |
| `client/src/api.js` | axios 基址改为 `API_BASE`（全站 25 处接口调用零改动受益） |
| `client/src/utils/edgeTts.js` | TTS 取音频地址改为 `${API_BASE}/tts`（两处） |
| `client/package.json` | 加入 `@capacitor/core`、`@capacitor/android`、`@capacitor/ios`、`@capacitor/cli`、`cross-env`；新增脚本 `build:app` |
| `client/capacitor.config.json` | appId `com.hldbrush.kidstar`、appName `启蒙星`、`webDir: dist` |
| `client/android/` | 已生成 Android 原生工程（含 `INTERNET` 权限，Web 资源已拷入 `assets/public`） |

`build:app` 脚本已内置后端地址：
```
cross-env VITE_API_BASE_URL=https://api.hldbrush.com/api vite build
```
> 即 App 内所有请求走 `https://api.hldbrush.com/api/*`，TTS 音频走 `https://api.hldbrush.com/api/tts`。

---

## 二、后端必须配合的两件事

### 2.1 部署并保留 `tts-audio/`
`api.hldbrush.com` 上运行的须是本项目 `server/` 代码，且 `server/tts-audio/`（含 `manifest.json` + 上万 mp3）**必须部署**。否则手机里朗读会回退到机械音 / 无声（Android WebView 基本不支持系统 Web Speech，离线 mp3 是最可靠路径）。

### 2.2 CORS 放行 App 来源（关键）
App 的 WebView 请求外网接口时，浏览器会带 `Origin`。后端 `cors` 中间件只允许 `CORS_ORIGIN` 列表内的来源，否则接口被拦。请在 `api.hldbrush.com` 所在服务器的环境变量中加入 App 来源：
```
CORS_ORIGIN=https://你的域名,capacitor://localhost,http://localhost
```
- Capacitor Android WebView 的来源通常是 `capacitor://localhost`（部分版本为 `http://localhost`），两个都加上最稳妥。
- **如何确认**：手机联调时，在接口请求的「网络」面板看 `Origin` 请求头，把真实值补进 `CORS_ORIGIN` 即可。
- 若仍被拦，临时用 `CORS_ORIGIN=*`（仅调试，生产不建议）。

> 同时确认 `api.hldbrush.com` 已设 `NODE_ENV=production`、`JWT_SECRET`（≥32 位）等生产配置（详见 `docs/部署文档.md` / `docs/宝塔部署文档.md`）。

---

## 三、本地预览 / 真机调试（可选）

需本机装好 **Android Studio**（含 SDK + 模拟器或真机 USB 调试）：
```bash
cd client
npm run build:app        # 用内置后端地址重新构建
npx cap sync android     # 把最新 Web 资源同步进 android 工程
npx cap run android      # 编译并安装到模拟器/真机
```

---

## 四、生成正式安装包

### Android（APK / AAB）
1. 用 **Android Studio** 打开 `client/android` 目录。
2. 配置签名：
   - `Build → Generate Signed Bundle / APK`
   - 新建 / 选择 `keystore`（请妥善保管，后续更新必须用同一 keystore，否则无法覆盖安装 / 上架）
3. 选择输出：
   - **Android App Bundle (.aab)**：上架 Google Play 推荐。
   - **APK**：直接分发 / 安装。
4. 产出位于 `client/android/app/release/`。

### iOS（需在 macOS + Xcode）
```bash
cd client
npm run build:app
npx cap add ios          # 仅在首次；Windows 无法执行，需在 Mac 上
npx cap sync ios
```
1. 打开 `client/ios/App.xcworkspace`。
2. 配置 `Signing & Capabilities`（团队 / Bundle Identifier `com.hldbrush.kidstar`）。
3. `Product → Archive` → 用 **Transporter** 上传 App Store Connect。

---

## 五、后续更新流程

1. 修改前端代码；
2. `cd client && npm run build:app`；
3. `npx cap sync android`（iOS 同理）；
4. 重新生成签名包（见第四节）。

> 注意：`client/android/`、`client/ios/` 已在 `.gitignore` 忽略（由 `cap add/sync` 生成，不必入库）。

---

## 六、注意事项

- **TTS 语音**：Android WebView 通常无系统 `speechSynthesis`，离线 mp3（`/api/tts`）+ 微软实时合成（`wss`）是主要路径；务必保证后端 `tts-audio/` 就位。
- **HTTPS**：后端须为 HTTPS（已满足），避免 Android 明文限制与混合内容拦截。
- **权限**：当前仅 `INTERNET`；如后续要麦克风 / 存储等，在 `android/app/src/main/AndroidManifest.xml` 与 iOS `Info.plist` 补充并 `cap sync`。
- **接口地址改了怎么办**：改 `package.json` 里 `build:app` 的 `VITE_API_BASE_URL` 后重新 `build:app` + `cap sync` 即可，无需动业务代码。

---

*最后整理：2026-09。配套代码改动见 `client/src/config.js`、`client/package.json`、`client/capacitor.config.json`。*
