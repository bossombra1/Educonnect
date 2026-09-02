export default {
  expo: {
    name: "EduConnect",
    slug: "educonnect",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "educonnect",
    platforms: ["android", "ios"],
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.educonnect.mobile"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.educonnect.mobile"
    },
    extra: {
      apiUrl: "http://10.0.2.2:3000/api",
      establishmentSlug: "Mon Établissement"
    },
    plugins: [
      "expo-router",
      "expo-asset",
      [
        "expo-notifications",
        {
          color: "#1E40AF"
        }
      ],
      "expo-secure-store"
    ],
    experiments: {
      typedRoutes: true
    }
  }
};