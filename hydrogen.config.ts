import {defineConfig, CookieSessionStorage} from '@shopify/hydrogen/config';

export default defineConfig({
  shopify: {
    defaultCountryCode: 'US',
    defaultLanguageCode: 'EN',
    storeDomain:
      // @ts-ignore
      Oxygen?.env?.PUBLIC_STORE_DOMAIN ||
      'shop1.shopify.hydrogen-demo.jason-addleman.us.spin.dev',
    storefrontToken:
      // @ts-ignore
      Oxygen?.env?.PUBLIC_STOREFRONT_API_TOKEN ||
      '65389b3bc9aa4edd7dd87c9b3a873df6',
    privateStorefrontToken:
      // @ts-ignore
      Oxygen?.env?.PRIVATE_STOREFRONT_API_TOKEN,
    storefrontApiVersion: 'unstable',
    // @ts-ignore
    storefrontId: Oxygen?.env?.PUBLIC_STOREFRONT_ID,
  },
  session: CookieSessionStorage('__session', {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24 * 30,
  }),
});
