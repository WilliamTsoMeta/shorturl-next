'use client';

import { useState, useEffect } from 'react';
import { SearchResult } from '@/types/search';
import { Header } from '@/components/Header';
import { createClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface SearchResponse {
  data: {
    hits: Array<{
      document: {
        id: string;
        type: string;
        attributes: {
          title?: string;
          description?: string;
          icon?: string;
          originalUrl?: string;
          shortUrl?: string;
          file?: string;
          name?: string;
          mimeType?: string;
          size?: number;
        }
      },
      highlight?: {
        attributes?: {
          title?: { snippet: string },
          description?: { snippet: string },
          name?: { snippet: string }
        }
      }
    }>;
    found: number;
  };
  success: boolean;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const body = JSON.stringify({
        params:{
            query: query || '',
            type: 'shorturl,file,share-collection'
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

  // 添加一个类型映射对象
  const typeLabels: { [key: string]: string } = {
    'shorturl': '短链接',
    'file': '文件',
    'share-collection': '分享集合'
  };

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
            
            {results.hits.map((hit) => {
              const typeLabel = typeLabels[hit.document.type] || hit.document.type;
              
              switch (hit.document.type) {
                case 'shorturl':
                  return (
                    <div key={hit.document.id} className="border p-4 rounded">
                      <div className="flex items-start gap-4">
                        {hit.document.attributes.icon && (
                          <img
                            src={hit.document.attributes.icon}
                            alt=""
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h2 className="text-xl font-semibold">
                              {hit.highlight?.attributes?.title ? (
                                <span dangerouslySetInnerHTML={{ 
                                  __html: hit.highlight.attributes.title.snippet 
                                }} />
                              ) : hit.document.attributes.title}
                            </h2>
                            <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded w-20 text-center">
                              {typeLabel}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-1">
                            {hit.highlight?.attributes?.description ? (
                              <span dangerouslySetInnerHTML={{ 
                                __html: hit.highlight.attributes.description.snippet 
                              }} />
                            ) : hit.document.attributes.description}
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
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                case 'file':
                  return (
                    <div key={hit.document.id} className="border p-4 rounded">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h2 className="text-xl font-semibold">
                              {hit.highlight?.attributes?.name ? (
                                <span dangerouslySetInnerHTML={{ 
                                  __html: hit.highlight.attributes.name.snippet 
                                }} />
                              ) : hit.document.attributes.name}
                            </h2>
                            <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded w-20 text-center">
                              {typeLabel}
                            </span>
                          </div>
                          
                          <div className="mt-2 space-y-2 text-sm text-gray-600">
                            {hit.document.attributes.description && (
                              <p>
                                {hit.highlight?.attributes?.description ? (
                                  <span dangerouslySetInnerHTML={{ 
                                    __html: hit.highlight.attributes.description.snippet 
                                  }} />
                                ) : hit.document.attributes.description}
                              </p>
                            )}
                            
                            <div className="flex gap-4">
                              {hit.document.attributes.mimeType && (
                                <span>
                                  类型: {hit.document.attributes.mimeType}
                                </span>
                              )}
                              {hit.document.attributes.size && (
                                <span>
                                  大小: {formatFileSize(hit.document.attributes.size)}
                                </span>
                              )}
                            </div>
                            
                            {hit.document.attributes.file && (
                              <a
                                href={hit.document.attributes.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                下载文件
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                case 'share-collection':
                  return (
                    <div key={hit.document.id} className="border p-4 rounded">
                      <div className="flex items-start gap-4">
                        {hit.document.attributes.image && (
                          <img
                            src={hit.document.attributes.image}
                            alt=""
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h2 className="text-xl font-semibold">
                              {hit.highlight?.attributes?.title ? (
                                <span dangerouslySetInnerHTML={{ 
                                  __html: hit.highlight.attributes.title.snippet 
                                }} />
                              ) : hit.document.attributes.title}
                            </h2>
                            <span className="text-sm px-2 py-1 bg-purple-100 text-purple-800 rounded w-20 text-center">
                              {typeLabel}
                            </span>
                          </div>
                          
                          <div className="mt-2 space-y-2 text-sm text-gray-600">
                            {hit.document.attributes.name && (
                              <div>
                                <span className="text-gray-500">名称：</span>
                                {hit.highlight?.attributes?.name ? (
                                  <span dangerouslySetInnerHTML={{ 
                                    __html: hit.highlight.attributes.name.snippet 
                                  }} />
                                ) : hit.document.attributes.name}
                              </div>
                            )}
                            
                            {hit.document.attributes.created_at && (
                              <div>
                                <span className="text-gray-500">创建时间：</span>
                                {new Date(hit.document.attributes.created_at).toLocaleString('zh-CN')}
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

                            {hit.document.attributes.resource_ids && hit.document.attributes.resource_ids.length > 0 && (
                              <div>
                                <span className="text-gray-500">资源数量：</span>
                                {hit.document.attributes.resource_ids.length} 个
                              </div>
                            )}

                            {hit.document.attributes.click_count !== undefined && (
                              <div>
                                <span className="text-gray-500">点击次数：</span>
                                {hit.document.attributes.click_count}
                              </div>
                            )}

                            {hit.document.tags && hit.document.tags.length > 0 && (
                              <div className="flex gap-2 items-center">
                                <span className="text-gray-500">标签：</span>
                                <div className="flex gap-1 flex-wrap">
                                  {hit.document.tags.map((tag, index) => (
                                    <span 
                                      key={index}
                                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                default:
                  return null;
              }
            })}
          </div>
        )}
      </div>
    </>
  );
}

// 添加文件大小格式化函数
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 