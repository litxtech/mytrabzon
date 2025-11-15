#!/usr/bin/env node

/**
 * Otomatik Sürüm Artırma Script'i
 * Her başarılı deploy'da sürümü otomatik artırır
 */

const fs = require('fs');
const path = require('path');

const VERSION_TYPE = process.argv[2] || 'patch'; // patch, minor, major

function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
      break;
  }
  
  return parts.join('.');
}

function bumpBuildNumber(buildNumber) {
  return (parseInt(buildNumber) || 1) + 1;
}

// app.json dosyasını oku
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// package.json dosyasını oku
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Mevcut sürümleri al
const currentVersion = appJson.expo.version;
const newVersion = bumpVersion(currentVersion, VERSION_TYPE);

// iOS build number artır
const currentIosBuild = appJson.expo.ios?.buildNumber || '1';
const newIosBuild = bumpBuildNumber(currentIosBuild).toString();

// Android version code artır
const currentAndroidCode = appJson.expo.android?.versionCode || 1;
const newAndroidCode = bumpBuildNumber(currentAndroidCode);

// Sürümleri güncelle
appJson.expo.version = newVersion;
appJson.expo.ios = appJson.expo.ios || {};
appJson.expo.ios.buildNumber = newIosBuild;
appJson.expo.android = appJson.expo.android || {};
appJson.expo.android.versionCode = newAndroidCode;

packageJson.version = newVersion;

// Dosyaları kaydet
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✅ Sürüm güncellendi:');
console.log(`   Version: ${currentVersion} → ${newVersion}`);
console.log(`   iOS Build: ${currentIosBuild} → ${newIosBuild}`);
console.log(`   Android Code: ${currentAndroidCode} → ${newAndroidCode}`);
