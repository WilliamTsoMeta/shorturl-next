'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales } from '@/lib/i18n/settings';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    // 从路径中移除当前的 locale 前缀
    const segments = pathname.split('/');
    const pathWithoutLocale = segments.length > 1 && locales.includes(segments[1] as any) 
      ? '/' + segments.slice(2).join('/')
      : pathname;
    
    // 构建新的路径
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    router.replace(newPath);
  };

  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {(() => {
            switch(loc) {
              case 'en':
                return 'English';
              case 'zh':
                return '简体中文';
              case 'zh-Hant':
                return '正體中文';
              default:
                return loc;
            }
          })()}
        </option>
      ))}
    </select>
  );
}