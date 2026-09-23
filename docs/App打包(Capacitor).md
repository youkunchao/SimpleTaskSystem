# 启蒙星 App 打包文档（Capacitor）

本文说明如何把「启蒙星」前端（React 18 + Vite 5 的 Web SPA）打包成 **Android / iOS 原生 App**。后端作为独立云服务部署在 `https://api.hldbrush.com`（接口挂在 `/api` 下），App 通过 HTTPS 调用，**后端不在手机内运行**——App 只是一个装了 WebView 的原生壳。

当前已验证可产出：**Android debug APK**（`release/启蒙星-v1.0-android-debug.apk`）。iOS 需在 macOS + Xcode 上出，本机（Windows）无法构建。

---

## 0. 总体架构与关键事实

- **壳**：Capacitor 把 `vite build` 产物（`client/dist/`）塞进原生 WebView，编译成真 `.apk`/`.aab`（Android）或 `.ipa`（iOS）。
- **云**：`server/`（Node + SQLite + 离线 TTS 音频）独立部署在 `api.hldbrush.com`。App 全部业务数据、朗读音频都来自这个后端。
- **唯一接口事实源**：`client/src/config.js` 的 `API_BASE`，由构建变量 `VITE_API_BASE_URL` 注入。打包脚本 `build:app` 已内置 `https://api.hldbrush.com/api`。
- **源码管理**：`client/android/`、`client/ios/` 由 `cap add/sync` 生成，已在 `.gitignore` 忽略，不入库；改完前端只需重跑 `build:app` + `cap sync`。

> ⚠️ 部署前请确认 `api.hldbrush.com` 已正确解析且 HTTPS 可达；当前（2026-09）该域名 DNS 未配置，App 装好也只能看到 UI，无法登录/加载内容/朗读。详见第 3 节与 `docs/部署文档.md`。

---

## 1. 环境准备（纯命令行，无需 Android Studio）

我们采用**独立 JDK + Android 命令行工具**直接 `gradlew` 出包，不依赖 Android Studio GUI。以下为构建机（Windows）已验证的路径，其他机器按需替换。

### 1.1 JDK 17（必需）
Gradle / Android Gradle Plugin 需要 JDK 17。
- 下载：Adoptium Temurin 17（LTS）。
- 示例目录：`C:\android-build\jdk17\jdk-17.0.20.1+1`。

### 1.2 Android 命令行工具（cmdline-tools）
不装 Android Studio，只装命令行工具：
1. 下载 [Android commandlinetools](https://developer.android.com/studio#command-line-tools-only)，解压到 `C:\android-build\sdk\cmdline-tools\latest\`。
2. 目录结构应为 `...\sdk\cmdline-tools\latest\bin\sdkmanager.bat`。

### 1.3 安装 SDK 包并接受许可
```bat
set ANDROID_HOME=C:\android-build\sdk
set JAVA_HOME=C:\android-build\jdk17\jdk-17.0.20.1+1

:: 安装必需组件（版本号可按需调整）
%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat "platform-tools" "platforms;android-34" "build-tools;34.0.0"

:: 接受所有许可协议（否则 gradle 构建会失败）
%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat --licenses
```
- `platform-tools`：提供 `adb`（安装/调试用）。
- `platforms;android-34`：Android 14 编译平台。
- `build-tools;34.0.0`：apksigner / zipalign 等构建工具。

### 1.4 环境变量（构建前务必设置）
```bat
set JAVA_HOME=C:\android-build\jdk17\jdk-17.0.20.1+1
set ANDROID_HOME=C:\android-build\sdk
set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin
```
> PowerShell 用：`$env:JAVA_HOME=...; $env:ANDROID_HOME=...`。建议把这些写进系统环境变量或构建脚本开头，避免每次重设。

### 1.5 Node.js 与 npm
- Node 18+（Vite 5 要求）。构建前端用，与安卓 SDK 无关。
- `cd client && npm install`（已含 Capacitor 依赖与 `cross-env`）。

---

## 2. 工程已完成的改动（可直接打包）

| 文件 | 改动说明 |
|---|---|
| `client/src/config.js` | 新增 `API_BASE`：`(import.meta.env.VITE_API_BASE_URL \|\| '/api').replace(/\/+$/,'')`，全站接口/TTS 的唯一基址来源 |
| `client/src/api.js` | axios 实例 `baseURL` 改用 `API_BASE` |
| `client/src/utils/edgeTts.js` | 两处 TTS 取音频地址改为 `${API_BASE}/tts` |
| `client/package.json` | 加入 `@capacitor/core`、`@capacitor/android`、`@capacitor/ios`、`@capacitor/cli`、`cross-env`；新增脚本 `build:app` |
| `client/capacitor.config.json` | `appId: com.hldbrush.kidstar`、`appName: 启蒙星`、`webDir: dist` |
| `client/android/` | 已生成 Android 原生工程（`AndroidManifest.xml` 已含 `INTERNET` 权限，Web 资源已拷入 `assets/public`） |

`build:app` 脚本（已内置后端地址）：
```json
"build:app": "cross-env VITE_API_BASE_URL=https://api.hldbrush.com/api vite build"
```
即 App 内所有请求走 `https://api.hldbrush.com/api/*`，TTS 音频走 `https://api.hldbrush.com/api/tts`。

---

## 3. 后端必须配合（否则 App 装好也用不了）

### 3.1 部署并保留 `tts-audio/`
`api.hldbrush.com` 上运行的须是本项目 `server/` 代码，且 `server/tts-audio/`（含 `manifest.json` + 上万 mp3）**必须整目录部署**。否则手机里朗读会回退到机械音 / 无声——Android WebView 基本不支持系统 Web Speech，离线 mp3 是最可靠路径。

### 3.2 CORS 放行 App 来源（关键，最易踩坑）
App 的 WebView 请求外网接口时，浏览器会带 `Origin`。后端 `cors` 中间件只允许 `CORS_ORIGIN` 列表内的来源，否则接口被拦截（现象：登录/加载一直转圈或报网络错误，但后端日志无访问）。请在 `api.hldbrush.com` 所在服务器的环境变量加入 App 来源：
```
CORS_ORIGIN=https://你的前端域名,capacitor://localhost,http://localhost
```
- Capacitor Android WebView 来源通常是 `capacitor://localhost`（部分版本为 `http://localhost`），**两个都加最稳妥**。
- 如何确认真实 Origin：手机联调时，在接口请求的「网络」面板看 `Origin` 请求头，把真实值补进 `CORS_ORIGIN` 即可。
- 临时调试可用 `CORS_ORIGIN=*`，**生产不建议**。

### 3.3 生产配置
确认 `api.hldbrush.com` 已设：`NODE_ENV=production`、`JWT_SECRET`（≥32 位）、`PORT`、`CORS_ORIGIN`（见 3.2）。详见 `docs/部署文档.md` / `docs/宝塔部署文档.md`。

---

## 4. 本地命令行构建安卓包（重点，已验证）

> 不需要 Android Studio。只要 1.4 的环境变量设置好，全程命令行。

### 4.1 一键构建（示例，Windows PowerShell）
```powershell
$env:JAVA_HOME='C:\android-build\jdk17\jdk-17.0.20.1+1'
$env:ANDROID_HOME='C:\android-build\sdk'

cd client
npm install                 # 首次或依赖变动时
npm run build:app           # 用内置后端地址构建 Web 资源到 client/dist
npx cap sync android        # 把 dist 同步进 android 工程（更新 assets/public）

cd client/android
.\gradlew.bat assembleDebug # 调试包；assembleRelease 为正式包
```
产物：
- 调试：`client/android/app/build/outputs/apk/debug/app-debug.apk`
- 正式：`client/android/app/build/outputs/apk/release/app-release.apk`（或 `release/app-release.aab`）

### 4.2 分步说明
1. **构建 Web 资源**：`npm run build:app` → `VITE_API_BASE_URL` 写死进 `dist`，输出到 `client/dist/`。
2. **同步进原生壳**：`npx cap sync android` 把 `dist/` 拷进 `android/app/src/main/assets/public/`，并同步 plugin/权限配置。
3. **编译**：`gradlew assembleDebug`（调试签名，默认 debug keystore）或 `assembleRelease`（需配签名，见第 6 节）。
4. **可选**：`npx cap build android` 一条命令等价于 `sync` + `gradlew assemble`（适合不想手动敲 gradle 的场景）。

### 4.3 把包复制到发布目录（可选）
```powershell
Copy-Item client/android/app/build/outputs/apk/debug/app-debug.apk `
  -Destination release/启蒙星-v1.0-android-debug.apk -Force
```

---

## 5. 真机安装与调试

### 5.1 通过 adb 安装（USB 调试）
1. 手机「开发者选项 → USB 调试」开启，连电脑。
2. `adb devices` 确认已识别。
3. `adb install -r client/android/app/build/outputs/apk/debug/app-debug.apk`（`-r` 覆盖安装）。

### 5.2 直接分发安装（debug 包）
把 `app-debug.apk` 发到手机，打开时允许「未知来源」安装即可。适合内部测试，**不要上架**。

### 5.3 WebView 远程调试
1. 手机开启 USB 调试，连电脑。
2. 电脑 Chrome 打开 `chrome://inspect/#devices` → 看到「启蒙星」WebView → 点 inspect。
3. 可看 Console、Network（确认接口 `Origin`、TTS 音频是否 200）、定位白屏/报错。

---

## 6. 生成正式签名包（release，可上架）

调试包用默认 debug keystore，无法上架且换机器装不上。**正式发布必须用自己的 keystore**。

### 6.1 生成 keystore（仅一次）
```bat
keytool -genkeypair -v ^
  -keystore release/kidstar-release.keystore ^
  -alias kidstar -keyalg RSA -keysize 2048 -validity 10000
```
按提示设密钥库口令与密钥口令（务必牢记、备份）。`validity 10000` 表示有效期约 27 年。

### 6.2 在 `client/android/app/build.gradle` 配置签名
```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile     file("../../../release/kidstar-release.keystore") // 相对 android/app 的路径
            storePassword System.getenv("KEYSTORE_PASSWORD")                 // 建议走环境变量，别硬编码进库
            keyAlias      "kidstar"
            keyPassword   System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```
> 不要把密钥口令明文写进 `build.gradle`（会进版本库）。用 `KEYSTORE_PASSWORD` / `KEY_PASSWORD` 环境变量，或在本地 `gradle.properties` 里配（已被 gitignore）。

### 6.3 出包
```bat
set KEYSTORE_PASSWORD=你的密钥库口令
set KEY_PASSWORD=你的密钥口令
cd client/android
gradlew.bat assembleRelease
```
产出：`client/android/app/build/outputs/apk/release/app-release.apk`（直分）或 `app-release.aab`（上架 Google Play）。

### 6.4 keystore 保管（极重要）
- **同一 keystore 才能覆盖安装 / 上架更新版本**。丢失 = 无法更新 App，只能换包名重发。
- 备份到安全位置（密码管理器 / 离线存储），不要提交进 git。

---

## 7. 改后端地址（本地联调 / 换域名 / 多渠道）

App 的接口地址完全由构建时 `VITE_API_BASE_URL` 决定，**改地址不必动业务代码**。

- **换线上域名**：改 `client/package.json` 里 `build:app` 的 `VITE_API_BASE_URL`，重跑 `build:app` + `cap sync` + 编译。
- **本地联调（手机连你电脑后端）**：
  1. 本机起后端：`cd server && npm install && npm start`（默认 `:3001`，需 `JWT_SECRET` 等）。
  2. 查电脑局域网 IP（如 `192.168.1.20`）。
  3. 用临时脚本构建：`cross-env VITE_API_BASE_URL=http://192.168.1.20:3001/api vite build`（可在 `package.json` 加 `build:local` 脚本）。
  4. 手机与电脑同一 WiFi，`cap sync` + `assembleDebug` + `adb install`。此时 `CORS_ORIGIN` 需包含 `capacitor://localhost,http://localhost`。
- **多环境**：可加 `build:app`、`build:local`、`build:stag` 等多个脚本，分别注入不同 `VITE_API_BASE_URL`。

---

## 8. iOS 打包（必须在 macOS + Xcode）

Windows 无法构建 IPA，需在 Mac 上完成：
```bash
cd client
npm install
npm run build:app          # 用内置后端地址构建
npx cap add ios            # 仅首次，生成 client/ios
npx cap sync ios
```
1. 打开 `client/ios/App.xcworkspace`（**必须 Xcode**，不能用 Android Studio）。
2. 选 `Signing & Capabilities` → 登录 Apple 开发者账号、设 Bundle Identifier `com.hldbrush.kidstar`、选 Team。
3. `Product → Archive` → 在 Organizer 里「Distribute App」→ 用 **Transporter** 上传 App Store Connect（或导出 Ad Hoc / Enterprise IPA 内测）。
4. iOS 同样需要后端 `CORS_ORIGIN` 放行 App 来源（iOS Capacitor 的 Origin 通常为 `capacitor://localhost`，加上即可）。

---

## 9. 后续更新流程

1. 修改前端代码（`client/src/**`）。
2. `cd client && npm run build:app`。
3. `npx cap sync android`（iOS 同理 `cap sync ios`）。
4. 重新生成包：调试 `assembleDebug` / 正式 `assembleRelease`（见第 4、6 节）。
5. 分发 / 上架。

> `client/android/`、`client/ios/` 已在 `.gitignore` 忽略（由 `cap add/sync` 生成，不必入库）。只需把 `client/src/**`、`client/package.json`、`client/capacitor.config.json` 提交即可。

---

## 10. 常见问题排错

| 现象 | 可能原因 | 处理 |
|---|---|---|
| `gradlew` 报 `Could not find ... build-tools` / `platforms;android-34` | SDK 组件没装或版本不匹配 | 回到 1.3 装对应组件；或在 `build.gradle` 改 `compileSdk`/`buildToolsVersion` 匹配已装版本 |
| `A license was not accepted` | 未接受 SDK 许可 | `sdkmanager --licenses` 全部 accept |
| `JAVA_HOME is not set` / 用了 JDK 8/11 | JDK 版本错 | 设 `JAVA_HOME` 指向 JDK 17（1.4） |
| App 打开白屏 | `dist` 没同步进壳 / Web 资源路径错 | 重跑 `npx cap sync android` 后再编译 |
| 登录/加载一直转圈，后端无日志 | CORS 拦截（Origin 不在 `CORS_ORIGIN`） | 按 3.2 把 `capacitor://localhost,http://localhost` 加入 `CORS_ORIGIN` |
| 接口报网络错误但浏览器能开 | 后端域名未解析 / HTTPS 不通 | 确认 `api.hldbrush.com` 已部署且可达（见 0 节提醒） |
| 朗读是机械音/无声 | 后端 `tts-audio/` 没部署 | 整目录部署 `server/tts-audio/`（含 manifest） |
| `adb install` 失败 `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | debug/release 签名不一致 | 卸载旧包再装，或统一用同一 keystore |
| 真机无法 `adb` 识别 | 未开 USB 调试 / 驱动问题 | 开开发者选项+USB调试；装驱动；`adb kill-server && adb start-server` |

---

## 11. 注意事项

- **TTS 语音**：Android WebView 通常无系统 `speechSynthesis`，离线 mp3（`/api/tts`）+ 微软实时合成（`wss`）是主要路径；务必保证后端 `tts-audio/` 就位。
- **HTTPS**：后端须为 HTTPS，避免 Android 明文限制与混合内容拦截（已满足，因指向 `api.hldbrush.com`）。
- **权限**：当前仅 `INTERNET`；后续若需麦克风 / 存储 / 摄像头，在 `android/app/src/main/AndroidManifest.xml` 与 iOS `Info.plist` 补充并 `cap sync`。
- **接口地址**：统一走 `VITE_API_BASE_URL` 注入，业务代码零改动（见第 7 节）。
- **包名/应用名**：`com.hldbrush.kidstar` / `启蒙星`，定义在 `client/capacitor.config.json`。改了要 `cap sync` 重新生成原生壳。
- **已提交的包**：`release/启蒙星-v1.0-android-debug.apk`（调试签名，仅测试）。正式发布请按第 6 节重新签名出 `release` 包。

---

*最后整理：2026-09。配套代码改动见 `client/src/config.js`、`client/package.json`、`client/capacitor.config.json`；后端部署见 `docs/部署文档.md` / `docs/宝塔部署文档.md`。*
