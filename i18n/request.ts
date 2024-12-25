import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from '@/lib/i18n/settings';

export default getRequestConfig(async ({ requestLocale }) => {
  // 等待 requestLocale Promise 解析
  const locale = await requestLocale || defaultLocale;
  
  // 验证 locale 是否在支持的列表中
  if (!locales.includes(locale as any)) {
    return {
      messages: (await import(`../messages/${defaultLocale}.json`)).default,
      timeZone: 'Asia/Shanghai'
    };
  }

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Asia/Shanghai'
  };
}); 