export default {
  expo: {
    name: "KMS Mobile",
    slug: "kms-mobile",
    version: "1.0.0",
    scheme: "kmsmobile",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    runtimeVersion: {
      policy: "appVersion"
    },
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.kms.mobile"
    },
    android: {
      package: "com.kms.mobile",
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "e28edc68-d551-49b6-a3d8-2517b252f91a"
      },
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://kms-api-gkexamccg9hfbza8.southeastasia-01.azurewebsites.net"
    }
  }
};
