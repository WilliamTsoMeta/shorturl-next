'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';

export default function CreateLink() {
  const router = useRouter();
  const [shareName, setShareName] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [project, setProject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    try {
      // Upload image if exists
      let imageUrl = '';
      if (image) {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('link-images')
          .upload(`${Date.now()}-${image.name}`, image);

        if (uploadError) throw uploadError;
        imageUrl = uploadData.path;
      }

      // Create link record
      const { error } = await supabase.from('links').insert({
        share_name: shareName,
        short_url: shortUrl,
        project,
        title,
        description,
        image_url: imageUrl,
      });

      if (error) throw error;
      router.push('/link_list');
    } catch (error) {
      console.error('Error creating link:', error);
      alert('Failed to create link');
    }
  };

  return (
    <div>
      <div className="flex items-center p-4 border-b dark:border-gray-700">
        <button
          onClick={() => router.back()}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          取消
        </button>
        <h1 className="flex-1 text-center text-lg font-medium">新建連結</h1>
        <div className="w-[32px]"></div>
      </div>
      <div className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              連結名稱
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={shareName}
              onChange={(e) => setShareName(e.target.value)}
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              短網址
              <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 dark:bg-gray-600 border border-r-0 dark:border-gray-600 rounded-l-md">
                d.uppmkt.com/
              </span>
              <input
                type="text"
                value={shortUrl}
                onChange={(e) => setShortUrl(e.target.value)}
                className="flex-1 p-2 border rounded-r-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              所屬專案
            </label>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Please input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              標籤
            </label>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 dark:bg-gray-700 rounded-md flex items-center bg-gray-200">
                Planning Deck
                <button type="button" className="ml-2">×</button>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              {imagePreview ? (
                <div className="relative w-full h-48">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <div className="text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleImageChange}
                        accept="image/*"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Please enter..."
              maxLength={120}
            />
            <div className="text-right text-sm text-gray-500">{title.length}/120</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Please enter..."
              rows={4}
              maxLength={240}
            />
            <div className="text-right text-sm text-gray-500">{description.length}/240</div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md"
            >
              重置
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md"
            >
              新建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
