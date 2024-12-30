'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean; action?: string | null }>>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');

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
    const endpoint = `${process.env.NEXT_PUBLIC_WINDMILL_ASYNC}/dify/generate_shorturl`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_WINDMILL}`
      },
      body: JSON.stringify({
        "user_input": userInput
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
      
      if (finishedEvent) {
        return {
          text: finishedEvent.data.outputs.text,
          action: null // 如果需要处理action，可以从这里添加
        };
      }

      // 如果没有找到 workflow_finished，尝试找最后一个有文本输出的节点
      const lastTextEvent = events.reverse().find((event: any) => 
        event.data?.outputs?.text || event.data?.text
      );

      if (lastTextEvent) {
        return {
          text: lastTextEvent.data.outputs?.text || lastTextEvent.data.text,
          action: null
        };
      }
    }

    throw new Error('No valid message found in response');
  }

  // 轮询任务结果
  async function pollJobResult(jobId: string, maxAttempts = 30) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const result = await checkJobResult(jobId);
        
        if (result.completed) {
          return result;
        }
        
        // 等待1秒后再次尝试
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Poll error:', error);
        throw error;
      }
    }
    
    throw new Error('Job polling timeout');
  }

  const handleResponse = async (userInput: string) => {
    setIsLoading(true);
    try {
      // 1. 触发异步任务
      const jobId = await triggerAsyncJob(userInput);
      console.log('获取到 Job ID:', jobId);

      // 2. 轮询结果
      const result = await pollJobResult(jobId);
      console.log('获取到结果:', result);

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

  return (
    <div>
      <main>{children}</main>

      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed bottom-4 right-4 bg-indigo-600 text-white rounded-full p-3 shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg
          className="h-6 w-6"
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
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  onClick={() => handleMessageClick(message.action)}
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  } ${!message.isUser && message.action ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600' : ''}`}
                >
                  {message.text}
                  {!message.isUser && message.action && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      点击跳转 →
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* 显示正在流式传输的消息 */}
            {currentStreamingMessage && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  {currentStreamingMessage}
                </div>
              </div>
            )}
            {/* Loading indicator */}
            {isLoading && !currentStreamingMessage && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex space-x-2 items-center">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 输入框区域 */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
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
      </Sidebar>
    </div>
  );
}
