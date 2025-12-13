'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAccount } from 'wagmi';
import { Loader2, Send, User, Trash2, MessageCircle, X, Terminal, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  reply_content?: string; 
}

// 🏷️ 标签配置 (适配深色科技风：高亮荧光色 + 半透明背景)
const TAG_OPTIONS = [
  { label: 'General', value: 'General', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { label: 'Idea', value: 'Idea', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  { label: 'Bug Report', value: 'Bug', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { label: 'Alpha', value: 'Alpha', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
];

// 辅助函数：获取标签样式
const getTagStyle = (tagValue: string) => {
  const found = TAG_OPTIONS.find(t => t.value === tagValue);
  return found ? found.color : 'bg-slate-800 text-slate-400 border-slate-700';
};

// 辅助函数：生成像素头像
const getAvatarUrl = (seed: string) => 
  `https://api.dicebear.com/7.x/identicon/svg?seed=${seed || 'default'}&backgroundColor=12141a`;

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !isConnected) return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert([{ 
        content, 
        wallet_address: address, 
        nickname: nickname || 'Anon User',
        tag: selectedTag 
      }]);
      if (error) throw error;
      setContent('');
      setNickname('');
      setSelectedTag('General');
      fetchMessages(); 
    } catch (error) {
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Confirm delete?')) return;
    try {
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      alert('Delete failed');
    }
  };

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
      alert('Reply failed');
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-8 font-sans">
      
      {/* --- 1. 发布区域 (深色面板) --- */}
      <div className="max-w-3xl mx-auto mb-20">
        <div className="bg-[#12141a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-1 shadow-2xl">
          <div className="bg-[#0B0C10]/80 rounded-[20px] p-6 border border-white/5">
            
            <div className="flex items-center gap-2 mb-6 text-slate-400 text-xs font-mono uppercase tracking-widest border-b border-white/5 pb-4">
              <Terminal className="w-4 h-4 text-blue-500" />
              <span>Broadcast Protocol</span>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-5">
              <div className="flex flex-col md:flex-row gap-5">
                {/* 昵称输入 */}
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Nickname (Optional)"
                    disabled={!isConnected}
                    className="w-full bg-[#12141a] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                  />
                </div>
                
                {/* 标签选择 */}
                <div className="flex gap-2 flex-wrap items-center">
                  {TAG_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedTag(option.value)}
                      className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded-lg border transition-all duration-200 uppercase tracking-wide
                        ${selectedTag === option.value 
                          ? `${option.color} ring-1 ring-white/10` 
                          : 'bg-[#12141a] border-white/10 text-slate-500 hover:border-white/30'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 内容输入 */}
              <div className="relative group">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={isConnected ? "Share your thoughts with the ecosystem..." : "Connect wallet to broadcast..."}
                  disabled={!isConnected || sending}
                  rows={3}
                  className="w-full bg-[#12141a] border border-white/10 rounded-xl p-4 text-slate-200 text-sm focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-700 resize-none font-sans leading-relaxed"
                />
              </div>

              {/* 发送按钮 */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!isConnected || sending || !content.trim()}
                  className="group relative inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-lg font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>TRANSMIT</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* --- 2. 留言展示区域 (深色卡片流) --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-xs font-mono uppercase tracking-widest">Syncing Nodes...</span>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="break-inside-avoid relative group bg-[#12141a]/40 border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-[#12141a]/60 hover:-translate-y-1 backdrop-blur-sm"
            >
              {/* 删除按钮 (仅管理员可见) */}
              {isAdmin && (
                <button 
                  onClick={() => handleDelete(msg.id)}
                  className="absolute top-4 right-4 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* 头部信息 */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-black">
                    <img
                      src={getAvatarUrl(msg.wallet_address)}
                      alt="Avatar"
                      className="w-full h-full object-cover opacity-80"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                      {msg.nickname || 'Anon'}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {msg.wallet_address ? `${msg.wallet_address.slice(0, 6)}...${msg.wallet_address.slice(-4)}` : ''}
                    </p>
                  </div>
                </div>
                {msg.tag && (
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold uppercase ${getTagStyle(msg.tag)}`}>
                    {TAG_OPTIONS.find(t => t.value === msg.tag)?.label || msg.tag}
                  </span>
                )}
              </div>

              {/* 留言内容 */}
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-light">
                {msg.content}
              </p>
              
              {/* 官方回复 (深紫色卡片) */}
              {msg.reply_content && (
                <div className="mt-4 p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="px-1.5 py-0.5 bg-purple-500/20 rounded text-[9px] text-purple-400 font-bold uppercase tracking-wide border border-purple-500/20">
                      Dev Response
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed pl-1">
                    {msg.reply_content}
                  </p>
                </div>
              )}

              {/* 底部信息栏 */}
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                 <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-mono">
                   <Hash className="w-3 h-3" />
                   <span>ID: {msg.id}</span>
                   <span className="mx-1">|</span>
                   <span>{new Date(msg.created_at).toLocaleDateString()}</span>
                 </div>
                 
                 {/* 回复入口 (管理员) */}
                 {isAdmin && !replyingId && (
                  <button 
                    onClick={() => setReplyingId(msg.id)}
                    className="text-slate-500 hover:text-white flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MessageCircle className="w-3 h-3" /> Reply
                  </button>
                )}
              </div>

              {/* 管理员回复输入框 */}
              <AnimatePresence>
                {replyingId === msg.id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-white/5 overflow-hidden"
                  >
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type admin response..."
                      className="w-full text-xs p-3 bg-black/40 text-slate-200 placeholder:text-slate-600 rounded-lg border border-white/10 outline-none focus:border-purple-500/50 mb-2 resize-none font-mono"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => { setReplyingId(null); setReplyText(''); }}
                        className="px-3 py-1.5 text-[10px] text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors uppercase font-bold"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleReplySubmit(msg.id)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] rounded hover:shadow-[0_0_10px_rgba(147,51,234,0.3)] transition-all uppercase font-bold"
                      >
                        Send Reply
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}