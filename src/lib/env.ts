export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  revenueCatIos: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
  revenueCatAndroid: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || '',
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL || '',
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || '',
};

export const envReady = Boolean(env.supabaseUrl && env.supabaseAnonKey);
