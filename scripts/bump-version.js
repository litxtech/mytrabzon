#!/usr/bin/env node

/**
 * Otomatik Sürüm Artış Scripti
 * Her çalıştırıldığında version numarasını artırır (1.0.1 -> 1.0.2)
 * Hem app.json hem de package.json'ı günceller
 * Android versionCode ve iOS buildNumber'ı da artırır
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

function bumpVersion() {
  try {
    // app.json'ı oku
    const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

    // Mevcut version'ı al
    const currentVersion = appJson.expo.version;
    const [major, minor, patch] = currentVersion.split('.').map(Number);

    // Patch version'ı artır (1.0.1 -> 1.0.2)
    const newVersion = `${major}.${minor}.${patch + 1}`;

    // Build number'ları artır
    const currentAndroidVersionCode = appJson.expo.android.versionCode || 1;
    const currentIosBuildNumber = parseInt(appJson.expo.ios.buildNumber || '1', 10);

    const newAndroidVersionCode = currentAndroidVersionCode + 1;
    const newIosBuildNumber = (currentIosBuildNumber + 1).toString();

    // app.json'ı güncelle
    appJson.expo.version = newVersion;
    appJson.expo.android.versionCode = newAndroidVersionCode;
    appJson.expo.ios.buildNumber = newIosBuildNumber;

    // package.json'ı güncelle
    packageJson.version = newVersion;

    // Dosyaları kaydet
    fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

    console.log('✅ Sürüm başarıyla artırıldı!');
    console.log(`📱 Version: ${currentVersion} -> ${newVersion}`);
    console.log(`🤖 Android versionCode: ${currentAndroidVersionCode} -> ${newAndroidVersionCode}`);
    console.log(`🍎 iOS buildNumber: ${currentIosBuildNumber} -> ${newIosBuildNumber}`);

    return {
      version: newVersion,
      androidVersionCode: newAndroidVersionCode,
      iosBuildNumber: newIosBuildNumber,
    };
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

// Script doğrudan çalıştırılıyorsa
if (require.main === module) {
  bumpVersion();
}

module.exports = { bumpVersion };
