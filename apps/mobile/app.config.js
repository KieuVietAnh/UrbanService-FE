const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envFilePath = path.resolve(__dirname, '.env');
if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath });
}

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    './plugins/withGoogleMapsAndroidManifest.js',
    'expo-router',
  ],
  extra: {
    ...config.extra,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.urbanservice.me',
    EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  },
});
