import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from '@/lib/i18n/settings';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale || defaultLocale;
  
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Asia/Shanghai',
    now: new Date(),
  };
}); 