'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Gamepad2, QrCode, ExternalLink, ShieldCheck, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// ⚠️ Discord 链接
const DISCORD_LINK = "https://discord.gg/ajTnnwBppv"; 

export default function GiftPage() {
  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 selection:bg-purple-500/30 font-sans flex flex-col">
      
      {/* 1. 背景底噪 (Pro Style) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-green-900/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* 2. 顶部导航 */}
      <nav className="relative z-10 w-full p-6 max-w-7xl mx-auto">
        <Link 
          href="/secret" 
          className="inline-flex items-center text-xs font-mono text-slate-500 hover:text-white transition-colors uppercase tracking-wide group"
        >
          <ArrowLeft className="mr-2 h-3 w-3 group-hover:-translate-x-1 transition-transform" /> 
          RETURN TO ACCESS GATE
        </Link>
      </nav>

      {/* 3. 核心内容 */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full max-w-4xl mx-auto">
        
        {/* 标题区 */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-4 border border-white/5 shadow-xl">
             <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            Community Hub
          </h1>
          <p className="text-slate-400 font-light text-sm max-w-md mx-auto">
            Connect with the core team and other verified holders. Access exclusive channels and support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          
          {/* --- 1. Discord Card --- */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="h-full"
          >
            <a href={DISCORD_LINK} target="_blank" rel="noreferrer" className="block h-full group">
              <Card className="h-full bg-[#12141a] border-[#5865F2]/20 hover:border-[#5865F2] hover:bg-[#5865F2]/5 transition-all duration-300 cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#5865F2]"></div>
                <CardContent className="p-8 flex flex-col items-center justify-center h-full text-center">
                  
                  <div className="w-16 h-16 bg-[#5865F2]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#5865F2]/20 group-hover:scale-110 transition-transform duration-300">
                    <Gamepad2 className="w-8 h-8 text-[#5865F2]" />
                  </div>
                  
                  <h2 className="text-xl font-bold text-white mb-2">Discord Server</h2>
                  <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                    Join the conversation, participate in governance, and get live updates.
                  </p>
                  
                  <div className="mt-auto inline-flex items-center gap-2 text-xs font-mono font-bold text-[#5865F2] uppercase tracking-wider border border-[#5865F2]/30 px-4 py-2 rounded hover:bg-[#5865F2] hover:text-white transition-colors">
                    JOIN CHANNEL <ExternalLink className="w-3 h-3" />
                  </div>
                </CardContent>
              </Card>
            </a>
          </motion.div>

          {/* --- 2. WeChat Card --- */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="h-full"
          >
            <Card className="h-full bg-[#12141a] border-green-500/20 hover:border-green-500 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
              <CardContent className="p-8 flex flex-col items-center justify-center h-full text-center">
                
                <div className="flex items-center gap-2 text-green-500 font-bold mb-6 font-mono text-sm tracking-wide">
                  <MessageCircle className="w-4 h-4" /> WECHAT SUPPORT
                </div>
                
                {/* 二维码展示区 */}
                <div className="relative w-48 h-48 bg-white p-3 rounded-xl shadow-2xl shadow-green-900/20 mb-6 group-hover:scale-105 transition-transform duration-300">
                  <img 
                    src="/Wechat.png" 
                    alt="WeChat QR Code" 
                    className="w-full h-full object-contain"
                  />
                  {/* 扫描线动画装饰 */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/10 to-transparent h-1/2 w-full animate-[scan_3s_ease-in-out_infinite] pointer-events-none"></div>
                </div>
                
                <div className="mt-auto flex flex-col gap-1">
                   <span className="text-[10px] text-slate-500 font-mono uppercase">Verification Hash</span>
                   <code className="text-sm font-mono text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                     KIKI-NFT-HOLDER
                   </code>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>

        {/* 底部装饰文字 */}
        <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.5 }}
           className="mt-16 text-center"
        >
           <p className="text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">
              Protocol Secured • Member Access Only
           </p>
        </motion.div>

      </main>
    </div>
  );
}