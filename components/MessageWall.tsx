'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAccount } from 'wagmi';
import { Loader2, Send, User, Trash2, MessageCircle, X } from 'lucide-react';

// 🔥【重要】请在这里填入你自己的钱包地址（必须全小写）
const ADMIN_WALLET = "0x0752bddacb7b73e26a45e2b16cdea53311f46f7c".toLowerCase(); 

// 定义数据类型
interface Message {
  id: number;
  content: string;
  wallet_address: string;
  nickname?: string;
  created_at: string;
  tag?: string;
  reply_content?: string; // 新增：管理员回复
}

// 标签配置
const TAG_OPTIONS = [
  { label: '闲聊', value: 'General' },
  { label: '建议', value: 'Idea' },
  { label: 'Bug', value: 'Bug' },
  { label: 'Alpha', value: 'Alpha' },
];

// 🎨 新增：5种浅色渐变背景预设
const GRADIENTS = [
  "bg-gradient-to-br from-rose-50 to-orange-50 border-orange-100",   // 暖阳
  "bg-gradient-to-br from-indigo-50 to-blue-50 border-blue-100",     // 海洋
  "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100", // 森林
  "bg-gradient-to-br from-violet-50 to-purple-50 border-purple-100", // 紫罗兰
  "bg-gradient-to-br from-amber-50 to-yellow-50 border-yellow-100",  // 柠檬
];

// 辅助函数：根据 index 获取固定的渐变色
const getGradientClass = (index: number) => GRADIENTS[index % GRADIENTS.length];

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

  // 管理员状态
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  // 判断当前用户是否是管理员
  const isAdmin = address?.toLowerCase() === ADMIN_WALLET;

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
      const { error } = await supabase.from('messages').insert([{ 
        content, 
        wallet_address: address, 
        nickname: nickname || '神秘用户',
        tag: selectedTag 
      }]);
      if (error) throw error;
      setContent('');
      setNickname('');
      fetchMessages(); 
    } catch (error) {
      alert('发送失败');
    } finally {
      setSending(false);
    }
  };

  // 🗑️ 管理员删除功能
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条留言吗？')) return;
    try {
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      alert('删除失败');
    }
  };

  // 💬 管理员回复功能
  const handleReplySubmit = async (id: number) => {
    if (!replyText.trim()) return;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ reply_content: replyText })
        .eq('id', id);

      if (error) throw error;
      setReplyingId(null);
      setReplyText('');
      fetchMessages();
    } catch (error) {
      alert('回复失败');
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
          社区共建墙
        </h2>
        <p className="text-slate-400">
          {isAdmin ? "👑 管理员模式已激活" : "留下你的建议、发现或只是打个招呼"}
        </p>
      </div>

      {/* 发布框 (保持深色) */}
      <div className="max-w-2xl mx-auto mb-16 bg-slate-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl">
        <form onSubmit={handleSendMessage} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="你的昵称"
                disabled={!isConnected}
                className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {TAG_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedTag(option.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all 
                    ${selectedTag === option.value 
                      ? 'bg-purple-600 text-white border-purple-500' 
                      : 'bg-transparent border-white/10 text-slate-500 hover:bg-white/5'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isConnected ? "写点什么..." : "请先连接钱包"}
            rows={3}
            disabled={!isConnected}
            className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isConnected || sending || !content.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              发布
            </button>
          </div>
        </form>
      </div>

      {/* 瀑布流展示 */}
      {loading ? (
        <div className="text-center text-slate-500 py-10">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>加载中...</p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {messages.map((msg, index) => (
            <div
              key={msg.id}
              // ✨ 这里的 getGradientClass 实现了渐变色
              className={`break-inside-avoid relative group rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 border ${getGradientClass(index)}`}
            >
              {/* --- 管理员删除按钮 (右上角) --- */}
              {isAdmin && (
                <button 
                  onClick={() => handleDelete(msg.id)}
                  className="absolute top-3 right-3 p-1.5 bg-white/50 rounded-full text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-10"
                  title="删除留言"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* 头部 */}
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={getAvatarUrl(msg.wallet_address)}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full bg-white/50 border border-black/5"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-800">
                      {msg.nickname || '神秘用户'}
                    </h4>
                    {/* 标签徽章 */}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 border border-black/5 text-slate-600 font-medium">
                      {TAG_OPTIONS.find(t => t.value === msg.tag)?.label || '普通'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {msg.wallet_address.slice(0, 6)}...{msg.wallet_address.slice(-4)}
                  </p>
                </div>
              </div>

              {/* 内容 */}
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>

              {/* --- 官方回复展示区域 --- */}
              {msg.reply_content && (
                <div className="mt-4 p-3 bg-white/60 rounded-xl border-l-4 border-purple-400 text-xs">
                  <p className="font-bold text-purple-600 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> 管理员回复
                  </p>
                  <p className="text-slate-600">{msg.reply_content}</p>
                </div>
              )}

              {/* 底部信息栏 */}
              <div className="mt-4 pt-3 border-t border-black/5 flex justify-between items-center">
                <span className="text-[10px] text-slate-400">
                  {new Date(msg.created_at).toLocaleDateString()}
                </span>

                {/* --- 管理员回复按钮 --- */}
                {isAdmin && !replyingId && (
                  <button 
                    onClick={() => setReplyingId(msg.id)}
                    className="text-slate-400 hover:text-purple-600 flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MessageCircle className="w-3 h-3" /> 回复
                  </button>
                )}
              </div>

              {/* --- 管理员回复输入框 (仅在点击回复时显示) --- */}
              {replyingId === msg.id && (
                <div className="mt-3 pt-3 border-t border-black/5 animate-in fade-in slide-in-from-top-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="请输入回复内容..."
                    className="w-full text-xs p-2 bg-white/50 rounded-lg border border-black/10 outline-none focus:border-purple-400 mb-2"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => { setReplyingId(null); setReplyText(''); }}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleReplySubmit(msg.id)}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-500"
                    >
                      发送
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}