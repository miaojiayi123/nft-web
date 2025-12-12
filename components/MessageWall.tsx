'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // 引入刚才创建的客户端
import { useAccount } from 'wagmi'; // 获取钱包状态
import { Loader2, Send } from 'lucide-react';

// 定义数据库返回的数据类型
interface Message {
  id: number;
  content: string;
  wallet_address: string;
  created_at: string;
  tag?: string;
}

// 辅助函数：格式化钱包地址 (例如 0x1234...abcd)
const formatAddress = (addr: string) => {
  if (!addr) return 'Unknown';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

// 辅助函数：生成随机头像 (根据地址)
const getAvatar = (seed: string) => 
  `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;

export default function MessageWall() {
  const { address, isConnected } = useAccount(); // 获取当前用户状态
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // 1. 获取留言列表
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false }); // 最新留言在最前
      
      if (error) throw error;
      if (data) setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取数据
  useEffect(() => {
    fetchMessages();
  }, []);

  // 2. 发送留言
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          { 
            content: newMessage, 
            wallet_address: address, // 记录是谁发的
            tag: 'User' 
          }
        ]);

      if (error) throw error;

      // 发送成功后，清空输入框并刷新列表
      setNewMessage('');
      fetchMessages(); 
    } catch (error) {
      console.error('Error sending message:', error);
      alert('发送失败，请重试');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          链上留言墙
        </h2>
        <p className="mt-2 text-gray-400">
          永久记录你的声音 (需连接钱包)
        </p>
      </div>

      {/* --- 新增：发布留言区域 --- */}
      <div className="max-w-2xl mx-auto mb-12">
        <form onSubmit={handleSendMessage} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex gap-2 bg-black p-2 rounded-lg border border-white/10">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isConnected ? "写下你的想法..." : "请先连接钱包"}
              disabled={!isConnected || sending}
              className="flex-1 bg-transparent text-white placeholder-gray-500 px-4 py-3 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!isConnected || sending || !newMessage.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              发布
            </button>
          </div>
        </form>
      </div>

      {/* --- 留言展示区域 --- */}
      {loading ? (
        <div className="text-center text-white py-10">加载中...</div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="break-inside-avoid relative group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 shadow-sm hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={getAvatar(msg.wallet_address)}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full bg-zinc-800 object-cover"
                />
                <div>
                  <h4 className="font-mono text-sm text-purple-400">
                    {formatAddress(msg.wallet_address)}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed">
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}