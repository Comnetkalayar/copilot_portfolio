# Build APK from PWA

This repo is a web app/PWA. To package it as an Android APK, you must generate a valid Android package using a PWA wrapper tool.

## 1. Build the PWA

```powershell
npm install
npm run build
```

## 2. Confirm the built files

The `dist/` folder should contain:

- `index.html`
- `login.html`
- `admin.html`
- `project-detail.html`
- `manifest.json`
- `sw.js`
- `icons/`

If these files are present, the web app is ready for packaging.

## 3. Use Bubblewrap for a Trusted Web Activity APK

### Install Bubblewrap

```powershell
npm install -g @bubblewrap/cli
```

### Initialize the project

Bubblewrap requires an HTTPS-hosted PWA manifest URL. If you have a deployed site, use its manifest URL.

```powershell
bubblewrap init --manifest=https://your-site-url/manifest.json
```

Follow prompts for package name, app name, signing, and asset links.

### Build the APK

```powershell
bubblewrap build
```

This produces a valid APK in the generated Android project.

## 4. Common APK parse error causes

- The file is not a real APK.
- The APK build did not include `AndroidManifest.xml`.
- The package is an unsigned or malformed archive.
- The file was renamed from `.zip` or `.webbundle` without proper APK packaging.

## 5. If you want a local-only wrapper

Use Capacitor:

```powershell
npm install @capacitor/cli @capacitor/core @capacitor/android
npx cap init PortfolioWebsite com.portfolio.website --web-dir=dist
npx cap add android
npx cap copy android
npx cap open android
```

Then build from Android Studio.

### Android build requirements

- Install a JDK and set `JAVA_HOME` to your JDK install path.
- Install Android Studio or the Android SDK command-line tools.
- Use `npx cap copy android` after every `npm run build` to sync the latest web assets.

## 6. Notes

- A valid APK must be signed.
- For Bubblewrap, your site should be served over HTTPS.
- The error `packageInfo is null` means the APK file was not valid, not that your HTML is broken.
