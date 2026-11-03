# Local Android APK Build (No EAS)

## Prerequisites
- Android Studio installed
- Android SDK + Platform Tools installed
- `JAVA_HOME` set (JDK 17 recommended)

## One-time setup
```powershell
cd "A:\Web Application\FinMax\mobile"
npm.cmd install
npm run prebuild:android
```

## Build Debug APK (easy testing)
```powershell
cd "A:\Web Application\FinMax\mobile"
npm run apk:debug
```

APK output:
`A:\Web Application\FinMax\mobile\android\app\build\outputs\apk\debug\app-debug.apk`

## Build Release APK
```powershell
cd "A:\Web Application\FinMax\mobile"
npm run apk:release
```

APK output:
`A:\Web Application\FinMax\mobile\android\app\build\outputs\apk\release\app-release.apk`

Note: release signing config may be needed for Play Store distribution.
keep it 