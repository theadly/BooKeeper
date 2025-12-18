
export const CONFIG = {
  API_KEY: process.env.API_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_DEV: process.env.NODE_ENV === 'development',
  DEFAULT_CURRENCY: 'AED' as const,
  USD_TO_AED: 3.6725,
  VAT_RATE: 0.05,
  ADLY_FEE_RATE: 0.10,
};

if (!CONFIG.API_KEY) {
  console.error("CRITICAL: API_KEY is missing from environment. AI features will be disabled.");
}
