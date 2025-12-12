'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAccount } from 'wagmi';
import { Loader2, Send, User } from 'lucide-react';

// 定义数据类型
interface Message {
  id: number;
  content: string;
  wallet_address: string;
  nickname?: string;
  created_at: string;
  tag?: string;
}

// --- 改动 1: 更新标签颜色配置以适配浅色背景 ---
const TAG_OPTIONS = [
  { label: '闲聊', value: 'General', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { label: '建议', value: 'Idea', color: 'bg-green-100 text-green-800 border-green-200' },
  { label: 'Bug反馈', value: 'Bug', color: 'bg-red-100 text-red-800 border-red-200' },
  { label: 'Alpha', value: 'Alpha', color: 'bg-purple-100 text-purple-800 border-purple-200' },
];

// 辅助函数：根据钱包地址生成随机像素头像 URL
const getAvatarUrl = (seed: string) => 
  `https://api.dicebear.com/7.x/identicon/svg?seed=${seed || 'default'}`;

export default function MessageWall() {
  const { address, isConnected } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // 表单状态
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedTag, setSelectedTag] = useState('General');

  // 获取留言
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setMessages(data);
    } catch (error) {
      console.error('Error fetching:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // 发送留言
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !isConnected) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          { 
            content, 
            wallet_address: address, 
            nickname: nickname || '神秘用户',
            tag: selectedTag 
          }
        ]);

      if (error) throw error;

      // 重置表单并刷新
      setContent('');
      setNickname('');
      setSelectedTag('General');
      fetchMessages(); 
    } catch (error) {
      console.error('Error sending:', error);
      alert('发送失败');
    } finally {
      setSending(false);
    }
  };

  // 辅助函数：根据 tag 获取颜色样式 (适配浅色底的默认值)
  const getTagStyle = (tagValue: string) => {
    const found = TAG_OPTIONS.find(t => t.value === tagValue);
    return found ? found.color : 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
          社区共建墙
        </h2>
        <p className="text-slate-400">
          留下你的建议、发现或只是打个招呼
        </p>
      </div>

      {/* --- 发布区域 (保持深色风格以融入背景) --- */}
      <div className="max-w-2xl mx-auto mb-16 bg-slate-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl">
         <form onSubmit={handleSendMessage} className="space-y-4">
          
          <div className="flex flex-col md:flex-row gap-4">
            {/* 昵称输入 */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="你的昵称 (选填)"
                disabled={!isConnected}
                className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            {/* 标签选择 */}
            <div className="flex gap-2 flex-wrap">
              {TAG_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedTag(option.value)}
                  // 这里也需要调整选中状态的样式，让它在深色背景上显眼
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 
                    ${selectedTag === option.value 
                      ? 'bg-purple-600 text-white border-purple-500 ring-1 ring-purple-400 scale-105' 
                      : 'bg-transparent border-white/10 text-slate-500 hover:bg-white/5'
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 留言内容 */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isConnected ? "写下你的想法..." : "请先连接钱包参与讨论"}
              disabled={!isConnected || sending}
              rows={3}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 resize-none"
            />
          </div>

          {/* 发送按钮 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isConnected || sending || !content.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-900/20"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              发布上墙
            </button>
          </div>
        </form>
      </div>

      {/* --- 留言展示区域 (瀑布流) --- */}
      {loading ? (
        <div className="text-center text-slate-500 py-10 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">正在加载链上数据...</span>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              // --- 改动 2: 卡片样式改为实心浅色系 ---
              // bg-white: 纯白背景
              // border-slate-200: 浅灰色边框
              // shadow-sm: 轻微阴影增加层次感
              // hover:bg-slate-50: 悬停时稍微变灰一点点
              className="break-inside-avoid relative group bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              {/* 卡片头部 */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  {/* 头像边框也改为浅色适应 */}
                  <img
                    src={getAvatarUrl(msg.wallet_address)}
                    alt="Avatar"
                    className="w-9 h-9 rounded-full bg-slate-100 object-cover border border-slate-200"
                  />
                  
                  {/* 用户名与地址 (改为深色文字) */}
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">
                      {msg.nickname || '神秘用户'}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {msg.wallet_address ? `${msg.wallet_address.slice(0, 6)}...${msg.wallet_address.slice(-4)}` : ''}
                    </p>
                  </div>
                </div>

                {/* 标签展示 (样式已在上方 TAG_OPTIONS 更新) */}
                {msg.tag && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getTagStyle(msg.tag)}`}>
                    {TAG_OPTIONS.find(t => t.value === msg.tag)?.label || msg.tag}
                  </span>
                )}
              </div>

              {/* 内容 (改为深色文字) */}
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
              
              {/* 底部时间 (改为浅色边框和中间色文字) */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                 <span className="text-[10px] text-slate-500">
                   {new Date(msg.created_at).toLocaleDateString()}
                 </span>
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}