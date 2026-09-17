// Injects Google Maps native keys + location plugin from environment variables.
// Base config lives in app.json and is passed in as `config`.

module.exports = ({ config }) => ({
  ...config,

  ios: {
    ...config.ios,

    config: {
      ...(config.ios && config.ios.config),

      googleMapsApiKey:
        process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ??
        config.ios?.config?.googleMapsApiKey,
    },

    infoPlist: {
      ...(config.ios && config.ios.infoPlist),

      NSLocationWhenInUseUsageDescription:
        "Find restaurants and deliver to your exact location",

      NSPhotoLibraryUsageDescription:
        "Upload food and restaurant photos to your menu",
    },
  },

  android: {
    ...config.android,

    jsEngine: "jsc",

    // Firebase google-services.json
    // EAS preview environment থেকে file path নেবে
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ??
      config.android?.googleServicesFile,

    config: {
      ...(config.android && config.android.config),

      googleMaps: {
        apiKey:
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ??
          config.android?.config?.googleMaps?.apiKey,
      },
    },
  },

  plugins: [
    ...(config.plugins || []),

    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Allow KhauGo to use your location while ordering.",
      },
    ],

    [
      "expo-image-picker",
      {
        photosPermission:
          "Upload food and restaurant photos to your menu",
      },
    ],
  ],
});