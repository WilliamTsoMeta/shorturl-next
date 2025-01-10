'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { createClient } from '@/lib/supabase';
import { useTeam } from '@/lib/contexts/TeamContext';
import ReactMarkdown from 'react-markdown';
import * as wmill from 'windmill-client';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean; action?: string | null }>>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  const { team, project } = useTeam();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shouldRedirect, setShouldRedirect] = useState(true);

  // 处理流式响应
  async function handleStreamingResponse(response: Response) {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader available for streaming response');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() && line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6));
            
            // 处理不同类型的事件
            if (eventData.event === 'workflow_started') {
              setCurrentStreamingMessage('');
            } else if (eventData.event === 'node_finished') {
              if (eventData.data.outputs?.text) {
                setCurrentStreamingMessage(prev => prev + eventData.data.outputs.text);
              }
            } else if (eventData.event === 'workflow_finished') {
              // 工作流完成时，将累积的消息添加到消息列表
              if (currentStreamingMessage) {
                setMessages(prev => [...prev, {
                  text: currentStreamingMessage,
                  isUser: false,
                  action: eventData.data.outputs?.action
                }]);
                setCurrentStreamingMessage('');
              }
            }
          } catch (e) {
            console.error('解析事件失败:', e);
          }
        }
      }
    }
  }

  // 触发异步任务
  async function triggerAsyncJob(userInput: string) {
    const client = createClient();
    const { data: { session } } = await client.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No access token found. Please login first.');
    }


    // 确保有team和project
    if (!team?.id || !project?.id) {
      console.log('team', team)
      throw new Error('No team or project found. Please try again.');
    }

    const endpoint = `${process.env.NEXT_PUBLIC_WINDMILL_ASYNC}/dify/generate_shorturl`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_WINDMILL}`
      },
      body: JSON.stringify({
        "user_input": userInput,
        "token": session.access_token,
        "teamId": team.id,
        "projectId": project.id,
        "tagIds": []
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const jobId = await response.text();
    return jobId;
  }

  // 检查任务结果
  async function checkJobResult(jobId: string) {
    const endpoint = `https://wm.uppeta.com/api/w/uppeta/jobs_u/completed/get_result_maybe/${jobId}`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_WINDMILL}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  }

  // 从结果中提取消息
  function extractMessageFromResult(result: any) {
    if (result?.result) {
      const events = result.result;
      // 找到最后一个 workflow_finished 事件
      const finishedEvent = events.find((event: any) => 
        event.event === 'workflow_finished' && event.data?.outputs?.text
      );
      
      if (finishedEvent && finishedEvent.data.status === 'succeeded') {
        // 重置跳转状态
        setShouldRedirect(true);
        
        // 如果当前在 link_list 页面，触发刷新
        if (window.location.pathname.includes('/link_list')) {
          if (shouldRedirect) {
            setTimeout(() => {
              window.location.reload();
            }, 10000);
          }
        } else {
          // 否则 3 秒后跳转
          if (shouldRedirect) {
            setTimeout(() => {
              router.push('/link_list');
            }, 10000);
          }
        }
        
        return {
          text: finishedEvent.data.outputs.text + '\n\n10秒后将跳转到链接列表页...',
          action: 'link_list'
        };
      }

      // 如果没有找到 workflow_finished，尝试找最后一个有文本输出的节点
      const lastTextEvent = events.reverse().find((event: any) => 
        event.data?.outputs?.text || event.data?.text
      );

      if (lastTextEvent) {
        return {
          text: lastTextEvent.data?.outputs?.text || lastTextEvent.data?.text,
          action: null
        };
      }
    }

    return {
      text: '无法获取结果',
      action: null
    };
  }

  // 轮询任务结果
  async function pollJobResult(jobId: string, maxAttempts = 120) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const result = await checkJobResult(jobId);
        
        if (result.completed) {
          return result;
        }
        
        // 等待1秒后再次尝试
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        console.error('Poll error:', error);
        throw error;
      }
    }
    
    throw new Error('任务处理超时，请稍后在链接列表中查看结果');
  }

  const handleResponse = async (userInput: string) => {
    setIsLoading(true);
    try {
      let jobId;
      
      if (selectedFile) {
        // 如果有文件，使用批量处理接口
        jobId = await triggerAsyncJobWithFile(userInput, selectedFile);
      } else {
        // 原有的无文件处理逻辑
        jobId = await triggerAsyncJob(userInput);
      }

      console.log('获取到 Job ID:', jobId);
      const result = await pollJobResult(jobId);
      // 3. 提取并处理消息
      const message = extractMessageFromResult(result);
      
      // 4. 更新消息列表
      setMessages(prev => [...prev, {
        text: message.text,
        isUser: false,
        action: message.action
      }]);

    } catch (error) {
      console.error('完整错误信息:', error);
      setMessages(prev => [...prev, { 
        text: `抱歉，发生了错误：${error.message}`, 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
      setSelectedFile(null); // 清除已选文件
      setUploadProgress(0);
    }
  };

  const handleSendMessage = async () => {
    if (inputText.trim() && !isLoading) {
      const userMessage = inputText.trim();
      setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
      setInputText('');
      await handleResponse(userMessage);
    }
  };

  const handleMessageClick = (action: string | null | undefined) => {
    if (action === 'link_list') {
      router.push('/link_list');
      setIsSidebarOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 修改文件上传处理函数
  const triggerAsyncJobWithFile = async (userInput: string, file: File) => {
    const client = createClient();
    const { data: { session } } = await client.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No access token found. Please login first.');
    }

    if (!team?.id || !project?.id) {
      throw new Error('No team or project found. Please try again.');
    }

    try {
      // 1. 上传文件到 Supabase Storage
      const bucketName = 'wm';  // 确保这个 bucket 在 Supabase 中已创建
      const filePath = `${Date.now()}-${file.name}`;
      
      const { data: uploadData, error: uploadError } = await client
        .storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // 2. 获取文件的公共URL
      const { data: { publicUrl } } = client
        .storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // 3. 调用 Windmill 脚本
      const endpoint = `${process.env.NEXT_PUBLIC_WINDMILL_ASYNC}/dify/batch_generate_shorturl_api`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_WINDMILL}`
        },
        body: JSON.stringify({
          user_input: userInput,
          urls_file: publicUrl,  // 传递文件的公共URL
          token: session.access_token,
          teamId: team.id,
          projectId: project.id,
          tagIds: []
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  };

  return (
    <div>
      <main>{children}</main>

      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed p-3 text-white bg-indigo-600 rounded-full shadow-lg bottom-4 right-4 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      >
        <div className="flex flex-col h-full">
          {/* 消息列表区域 */}
          <div className="flex-1 p-4 mb-4 space-y-4 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  onClick={() => handleMessageClick(message.action)}
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isUser
                      ? 'bg-indigo-600 text-white markdown-user'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 markdown-bot'
                  } ${!message.isUser && message.action ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600' : ''}`}
                >
                  {message.isUser ? (
                    message.text
                  ) : (
                    <ReactMarkdown 
                      components={{
                        // 自定义链接样式
                        a: ({node, ...props}) => (
                          <a 
                            {...props} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 underline hover:text-blue-600"
                          />
                        ),
                        // 自定义列表样式
                        ul: ({node, ...props}) => (
                          <ul {...props} className="my-2 ml-4 list-disc" />
                        ),
                        // 自定义粗体样式
                        strong: ({node, ...props}) => (
                          <strong {...props} className="font-bold" />
                        ),
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  )}
                  {!message.isUser && message.action && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        点击跳转 →
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShouldRedirect(false);
                        }}
                        className="px-2 py-1 text-xs text-red-500 border border-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900"
                      >
                        取消跳转
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* 显示正在流式传输的消息 */}
            {currentStreamingMessage && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <ReactMarkdown
                    components={{
                      a: ({node, ...props}) => (
                        <a 
                          {...props} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 underline hover:text-blue-600"
                        />
                      ),
                      ul: ({node, ...props}) => (
                        <ul {...props} className="my-2 ml-4 list-disc" />
                      ),
                      strong: ({node, ...props}) => (
                        <strong {...props} className="font-bold" />
                      ),
                    }}
                  >
                    {currentStreamingMessage}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            {/* Loading indicator */}
            {isLoading && !currentStreamingMessage && (
              <div className="flex justify-start">
                <div className="p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 输入框区域 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-2">
              {/* 文件上传区域 */}
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                  disabled={isLoading}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  上传CSV
                </label>
                {selectedFile && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    已选择: {selectedFile.name}
                  </span>
                )}
              </div>

              {/* 消息输入区域 */}
              <div className="flex space-x-2">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入消息..."
                  className="flex-1 min-h-[40px] max-h-[120px] p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100 resize-none"
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  className={`px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={isLoading}
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      </Sidebar>
    </div>
  );
}
