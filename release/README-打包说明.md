# 安装包输出目录（release/）

本目录存放「启蒙星」App 的安装包。

## 安卓 Android
- `启蒙星-v1.0-android-debug.apk`（15.4 MB）
- **调试签名**：可直接安装到安卓手机测试（需开启"允许未知来源"）。
- **正式发布**：用你自己的 keystore 重新签名出 release 版（AAB 上架 Google Play / APK 直分）：
  ```bash
  cd client/android
  # 在 app/build.gradle 的 buildTypes.release 配置 signingConfig，然后：
  .\gradlew.bat assembleRelease      # 产出 app-release.aab / app-release.apk
  ```

## 苹果 iOS（IPA）
> **无法在 Windows 上构建**，必须在 **macOS + Xcode** 完成。本目录没有 IPA。

在 Mac 上执行：
```bash
cd client
npm run build:app          # 用内置后端地址重新构建
npx cap add ios           # 仅首次（生成 client/ios）
npx cap sync ios
```
然后用 **Xcode** 打开 `client/ios/App.xcworkspace` → 配置 Signing（团队 / Bundle Id `com.hldbrush.kidstar`）→ `Product → Archive` → 用 Transporter 上传 / 导出 IPA。

## 后端配合（两种包都依赖）
- App 内接口固定指向 `https://api.hldbrush.com/api`，请确认该后端已按本项目 `server/` 部署。
- 后端 `CORS_ORIGIN` 需放行 App 来源：`capacitor://localhost,http://localhost`（避免接口被 CORS 拦截）。
- 必须部署 `server/tts-audio/`（含 manifest + 上万 mp3），否则手机内朗读为机械音/无声。
- 后端生产配置：`NODE_ENV=production`、`JWT_SECRET`（≥32 位）等（见 `docs/部署文档.md`）。

## 本地重构建命令
```bash
# 安卓（本机已装 JDK17 + Android SDK 于 C:\android-build）
$env:JAVA_HOME='C:\android-build\jdk17\jdk-17.0.20.1+1'
$env:ANDROID_HOME='C:\android-build\sdk'
cd client && npm run build:app && npx cap sync android
cd client/android && .\gradlew.bat assembleDebug
# 产物：client/android/app/build/outputs/apk/debug/app-debug.apk
```

---
构建时间：2026-09（Android debug）。iOS 包须在 Mac 出。
