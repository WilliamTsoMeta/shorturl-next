'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface LinkDetails {
  id: string;
  type: string;
  attributes: {
    title: string;
    shortUrl: string;
    originalUrl: string;
    description: string;
    icon: string;
    click_count: number;
    created_at: string;
  };
  qrcode?: {
    attributes: {
      qr_code_url: string;
    };
  };
}

export default function LinkDetail() {
  const params = useParams();
  const router = useRouter();
  const [link, setLink] = useState<LinkDetails | null>(null);

  useEffect(() => {
    // 从 localStorage 获取链接详情
    const linkDetailStr = localStorage.getItem('linkDetail');
    if (!linkDetailStr) {
      router.push('/link_list');
      return;
    }

    try {
      const linkDetail = JSON.parse(linkDetailStr);
      if (linkDetail.id !== params.id) {
        router.push('/link_list');
        return;
      }
      setLink(linkDetail);
    } catch (err) {
      router.push('/link_list');
    }
  }, [params.id, router]);

  if (!link) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* 头部信息 */}
          <div className="p-6 border-b dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {link.attributes.title}
              </h1>
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
              <span className="mr-4">创建于：{new Date(link.attributes.created_at).toLocaleDateString()}</span>
              <span>访问次数：{link.attributes.click_count}</span>
            </div>
          </div>

          {/* 链接信息 */}
          <div className="p-6 space-y-6">
            {/* 短链接和原始链接 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  短链接
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={link.attributes.shortUrl}
                    readOnly
                    className="flex-1 p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(link.attributes.shortUrl)}
                    className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="复制链接"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  原始链接
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={link.attributes.originalUrl}
                    readOnly
                    className="flex-1 p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(link.attributes.originalUrl)}
                    className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="复制链接"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 描述 */}
            {link.attributes.description && (
              <div className="pt-4 border-t dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  描述
                </label>
                <p className="text-gray-900 dark:text-gray-100">{link.attributes.description}</p>
              </div>
            )}

            {/* 预览图 */}
            {link.attributes.icon && (
              <div className="pt-4 border-t dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  预览图
                </label>
                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                  <img
                    src={link.attributes.icon}
                    alt="Link preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* 二维码 */}
            {link.qrcode?.attributes?.qr_code_url && (
              <div className="pt-4 border-t dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  二维码
                </label>
                <div className="w-48 h-48">
                  <img
                    src={link.qrcode.attributes.qr_code_url}
                    alt="QR Code"
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
