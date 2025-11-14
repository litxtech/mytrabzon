#!/usr/bin/env node

/**
 * Otomatik versiyon yükseltme script'i
 * 
 * Kullanım:
 * - patch: 1.0.0 -> 1.0.1 (bug fix)
 * - minor: 1.0.0 -> 1.1.0 (yeni özellik)
 * - major: 1.0.0 -> 2.0.0 (büyük değişiklik)
 * 
 * Örnek: node scripts/bump-version.js patch
 */

const fs = require('fs');
const path = require('path');

const VERSION_TYPE = process.argv[2] || 'patch'; // patch, minor, major
const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

// Versiyon numarasını parse et
function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

// Versiyon numarasını artır
function bumpVersion(version, type) {
  const parsed = parseVersion(version);
  
  switch (type) {
    case 'major':
      parsed.major += 1;
      parsed.minor = 0;
      parsed.patch = 0;
      break;
    case 'minor':
      parsed.minor += 1;
      parsed.patch = 0;
      break;
    case 'patch':
    default:
      parsed.patch += 1;
      break;
  }
  
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

// Build number'ı artır (iOS için)
function bumpBuildNumber(buildNumber) {
  return (parseInt(buildNumber) || 1) + 1;
}

// Version code'u artır (Android için)
function bumpVersionCode(versionCode) {
  return (parseInt(versionCode) || 1) + 1;
}

// Dosyaları güncelle
function updateFiles() {
  // app.json'u oku
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  const currentVersion = appJson.expo.version || '1.0.0';
  const newVersion = bumpVersion(currentVersion, VERSION_TYPE);
  
  // iOS build number
  const currentIosBuildNumber = appJson.expo.ios?.buildNumber || '1';
  const newIosBuildNumber = bumpBuildNumber(currentIosBuildNumber).toString();
  
  // Android version code
  const currentAndroidVersionCode = appJson.expo.android?.versionCode || 1;
  const newAndroidVersionCode = bumpVersionCode(currentAndroidVersionCode);
  
  // app.json'u güncelle
  appJson.expo.version = newVersion;
  if (!appJson.expo.ios) {
    appJson.expo.ios = {};
  }
  appJson.expo.ios.buildNumber = newIosBuildNumber;
  if (!appJson.expo.android) {
    appJson.expo.android = {};
  }
  appJson.expo.android.versionCode = newAndroidVersionCode;
  
  // package.json'u oku ve güncelle
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  packageJson.version = newVersion;
  
  // Dosyaları yaz
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n');
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');
  
  // Sonuçları yazdır
  console.log('✅ Versiyon güncellendi:');
  console.log(`   Version: ${currentVersion} -> ${newVersion}`);
  console.log(`   iOS Build Number: ${currentIosBuildNumber} -> ${newIosBuildNumber}`);
  console.log(`   Android Version Code: ${currentAndroidVersionCode} -> ${newAndroidVersionCode}`);
  
  return {
    version: newVersion,
    iosBuildNumber: newIosBuildNumber,
    androidVersionCode: newAndroidVersionCode,
  };
}

// Çalıştır
try {
  const result = updateFiles();
  process.exit(0);
} catch (error) {
  console.error('❌ Versiyon güncelleme hatası:', error.message);
  process.exit(1);
}

