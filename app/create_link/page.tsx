'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTeam } from '@/lib/contexts/TeamContext';
import QRCodeStyling from "qr-code-styling";

export default function CreateLink() {
  const router = useRouter();
  const { team, project } = useTeam();
  const [shareName, setShareName] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [longUrl, setLongUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const qrRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  type DotsType = "dots" | "rounded" | "square";

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrOptions, setQrOptions] = useState<{
    dotsType: DotsType;
    dotsColor: string;
    backgroundColor: string;
  }>({
    dotsType: "dots",
    dotsColor: "#000000",
    backgroundColor: "#FFFFFF",
  });

  useEffect(() => {
    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      qrCode.current = new QRCodeStyling({
        width: 200,
        height: 200,
        type: "canvas",
        data: shortUrl ? `https://upj.to/${shortUrl}` : "https://upj.to/",
        margin: 8,
        qrOptions: {
          errorCorrectionLevel: "L"
        },
        dotsOptions: {
          type: qrOptions.dotsType,
          color: qrOptions.dotsColor
        },
        backgroundOptions: {
          color: qrOptions.backgroundColor
        }
      });
      qrCode.current.append(qrRef.current);
    }
  }, [qrOptions, shortUrl]);

  useEffect(() => {
    if (qrCode.current && shortUrl) {
      qrCode.current.update({
        data: `https://upj.to/${shortUrl}`
      });
    }
  }, [shortUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
        
      if (!session?.access_token) {
        throw new Error('No access token found');
      }

      // Use a fixed image URL for now
      const imageUrl = 'https://picsum.photos/200';

      // Create shorturl
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/resource/shorturl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          type: 'shorturl',
          attributes: {
            icon: imageUrl || ''
          },
          shortUrl: {
            url: longUrl,
            slug: shortUrl,
            image: imageUrl,
            title: title,
            name: shareName,
            description: description
          },
          teamId: team?.id,
          projectId: project?.id,
          qrcodeOption: {
            options: {
              width: 400,
              height: 400,
              margin: 4,
            },
            saveAsTemplate: false,
            storeImage: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create shorturl');
      }

      // Redirect to link list page
      router.push('/link_list');
    } catch (error) {
      console.error('Error creating link:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="flex items-center p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <button
          onClick={() => router.back()}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          取消
        </button>
        <h1 className="flex-1 text-center text-lg font-medium text-gray-900 dark:text-gray-100">新建連結</h1>
        <div className="w-[32px]"></div>
      </div>
      <div className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Long URL
            </label>
            <input
              type="text"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter the long URL"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              短網址
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={shortUrl}
                  onChange={(e) => setShortUrl(e.target.value)}
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div className="flex-shrink-0 p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 relative group">
                <button 
                  onClick={() => setIsQRModalOpen(true)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-600 dark:text-gray-300">
                    <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div ref={qrRef} className="w-[200px] h-[200px] flex items-center justify-center">
                  {!shortUrl && (
                    <svg width="150" height="150" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                      <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h3v2h-3v-2zm0 4h3v2h-3v-2zM13 13h3v2h-3v-2zm0 4h3v2h-3v-2z" fill="currentColor"/>
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              連結名稱
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={shareName}
              onChange={(e) => setShareName(e.target.value)}
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              所屬專案
            </label>
            <input
              type="text"
              value={project?.id}
              onChange={(e) => {}}
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Please input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              標籤
            </label>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center">
                Planning Deck
                <button type="button" className="ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">×</button>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Please enter..."
              maxLength={120}
            />
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">{title.length}/120</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Please enter..."
              rows={4}
              maxLength={240}
            />
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">{description.length}/240</div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              重置
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              新建
            </button>
          </div>
        </form>
      </div>
      {isQRModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">自定義二維碼</h3>
              <button onClick={() => setIsQRModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">點的樣式</label>
                <select 
                  value={qrOptions.dotsType}
                  onChange={(e) => setQrOptions({...qrOptions, dotsType: e.target.value as DotsType})}
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="dots">圓點</option>
                  <option value="rounded">圓角方形</option>
                  <option value="square">方形</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">點的顏色</label>
                <input 
                  type="color"
                  value={qrOptions.dotsColor}
                  onChange={(e) => setQrOptions({...qrOptions, dotsColor: e.target.value})}
                  className="w-full p-1 border dark:border-gray-600 rounded-md bg-white h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">背景顏色</label>
                <input 
                  type="color"
                  value={qrOptions.backgroundColor}
                  onChange={(e) => setQrOptions({...qrOptions, backgroundColor: e.target.value})}
                  className="w-full p-1 border dark:border-gray-600 rounded-md bg-white h-10"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={() => setIsQRModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  qrCode.current?.update({
                    dotsOptions: {
                      type: qrOptions.dotsType,
                      color: qrOptions.dotsColor
                    },
                    backgroundOptions: {
                      color: qrOptions.backgroundColor
                    }
                  });
                  setIsQRModalOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
