'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
  const qrCode = useRef<QRCodeStyling>();

  useEffect(() => {
    qrCode.current = new QRCodeStyling({
      width: 100,
      height: 100,
      type: "canvas",
      data: "https://upj.to/",
      margin: 5,
      qrOptions: {
        errorCorrectionLevel: "L"
      },
      dotsOptions: {
        type: "dots",
        color: "#000000"
      },
      backgroundOptions: {
        color: "#FFFFFF"
      }
    });
  }, []);

  useEffect(() => {
    if (qrCode.current && qrRef.current && shortUrl) {
      qrRef.current.innerHTML = '';
      qrCode.current.update({
        data: `https://upj.to/${shortUrl}`
      });
      qrCode.current.append(qrRef.current);
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
              {shortUrl && (
                <div className="flex-shrink-0 p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                  <div ref={qrRef} />
                </div>
              )}
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
    </div>
  );
}
