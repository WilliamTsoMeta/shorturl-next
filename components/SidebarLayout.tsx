'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

// 模拟回复数据
const mockResponses = [
  {
    text: "好的，我带你去看看链接列表",
    action: "link_list"
  },
  {
    text: "你可以在链接列表页面查看所有短链接",
    action: "link_list"
  },
  {
    text: "让我为你展示链接列表页面",
    action: "link_list"
  },
  {
    text: "这是一个普通回复，不需要跳转。",
    action: null
  }
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean; action?: string | null }>>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // 模拟AI正在输入的效果
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    if (isTyping) {
      typingTimeout = setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    }
    return () => clearTimeout(typingTimeout);
  }, [isTyping]);

  const getRandomResponse = () => {
    const randomIndex = Math.floor(Math.random() * mockResponses.length);
    return mockResponses[randomIndex];
  };

  const simulateResponse = () => {
    setIsTyping(true);
    // 模拟延迟回复
    setTimeout(() => {
      setMessages(prev => [...prev, { text: getRandomResponse().text, isUser: false, action: getRandomResponse().action }]);
      setIsTyping(false);
    }, 2000);
  };

  const handleMessageClick = (action: string | null | undefined) => {
    if (action === 'link_list') {
      router.push('/link_list');
      setIsSidebarOpen(false);
    }
  };

  const handleSendMessage = () => {
    if (inputText.trim()) {
      setMessages(prev => [...prev, { text: inputText, isUser: true }]);
      setInputText('');
      simulateResponse();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                disabled={isTyping}
              />
              <button
                onClick={handleSendMessage}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  isTyping ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isTyping}
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
