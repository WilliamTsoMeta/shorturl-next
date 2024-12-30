import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { locales } from '@/lib/i18n/settings';
import { Providers } from '../providers';
import { Toaster } from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import "../globals.css";

const inter = Inter({ subsets: ['latin'] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Shanghai">
          <Providers>
            <SidebarLayout>
              {children}
            </SidebarLayout>
            <Toaster position="top-right" />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}