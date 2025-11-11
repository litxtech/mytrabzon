{
  "expo": {
    "name": "Mytrabzon",
    "slug": "mytrabzon",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "rork-app",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,

    "platforms": ["ios", "android", "web"],
    "runtimeVersion": { "policy": "sdkVersion" },

    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },

    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.litxtech.myTrabzon",
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "Allow $(PRODUCT_NAME) to access your photos",
        "NSCameraUsageDescription": "Allow $(PRODUCT_NAME) to access your camera",
        "NSMicrophoneUsageDescription": "Allow $(PRODUCT_NAME) to access your microphone"
      }
    },

    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.litxtech.mytrabzon",
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECORD_AUDIO"
      ]
    },

    "web": {
      "favicon": "./assets/images/favicon.png"
    },

    "plugins": [
      [
        "expo-router",
        { "origin": "https://rork.com/" }
      ],
      "expo-font",
      "expo-web-browser",
      [
        "expo-image-picker",
        {
          "photosPermission": "The app accesses your photos to let you share them with your friends."
        }
      ]
    ],

    "experiments": { "typedRoutes": true },

    "extra": {
      "router": { "origin": "https://rork.com/" },
      "eas": {
        "projectId": "368ac56e-da84-480e-b163-f04077df7fa6"
      }
    },

    "cli": { "appVersionSource": "local" }
  }
}
