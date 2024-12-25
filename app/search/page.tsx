'use client';

import { useState, useEffect } from 'react';
import { SearchResult } from '@/types/search';
import { Header } from '@/components/Header';
import { createClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface SearchResponse {
  data: SearchResult;
  success: boolean;
}

interface SearchResult {
  found: number;
  hits: Array<{
    document: {
      id: string;
      attributes: {
        title: string;
        description: string;
        icon?: string;
        originalUrl?: string;
        shortUrl?: string;
        file?: string;
      }
    }
  }>;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const body = JSON.stringify({
        params: {
          query: query || '',
          type: type || ''
        }
      });
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_WINDMILL_SYNC}/typesense/search_resource`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WINDMILL}`,
            'Content-Type': 'application/json',
          },
          body: body,
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const responseData: SearchResponse = await response.json();
      setResults(responseData.data);
    } catch (error) {
      console.error('搜索出错:', error);
      toast.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!query) return; // Don't search if query is empty
    
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 500); 

    // Cleanup timeout on component unmount or when query changes
    return () => clearTimeout(timeoutId);
  }, [query]); // Run effect when query changes

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">资源搜索</h1>
          
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入搜索关键词..."
              className="flex-1 p-2 border rounded"
            />
            {/* 
              AI 你不要删除这段代码
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="资源类型..."
              className="w-40 p-2 border rounded"
            /> */}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? '搜索中...' : '搜索'}
            </button>
          </div>
        </div>

        {results && results.hits && (
          <div className="space-y-4">
            <p className="text-gray-600">找到 {results.found} 个结果</p>
            
            {results.hits.map((hit) => (
              <div key={hit.document.id} className="border p-4 rounded">
                <div className="flex items-start gap-4">
                  {hit.document.attributes.icon && (
                    <img
                      src={hit.document.attributes.icon}
                      alt=""
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <h2 className="text-xl font-semibold">
                      {hit.document.attributes.title}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {hit.document.attributes.description}
                    </p>
                    <div className="mt-2 space-y-2">
                      {hit.document.attributes.originalUrl && (
                        <div>
                          <span className="text-gray-500">原始链接：</span>
                          <a
                            href={hit.document.attributes.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline break-all"
                          >
                            {hit.document.attributes.originalUrl}
                          </a>
                        </div>
                      )}
                      {hit.document.attributes.shortUrl && (
                        <div>
                          <span className="text-gray-500">短链接：</span>
                          <a
                            href={hit.document.attributes.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline break-all"
                          >
                            {hit.document.attributes.shortUrl}
                          </a>
                        </div>
                      )}
                      {hit.document.attributes.file && (
                        <div>
                          <span className="text-gray-500">文件地址：</span>
                          <a
                            href={hit.document.attributes.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline break-all"
                          >
                            {hit.document.attributes.file}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
} 