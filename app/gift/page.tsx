'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gamepad2, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// ⚠️ 在这里填入你的 Discord 邀请链接
const DISCORD_LINK = "https://discord.gg/ajTnnwBppv"; 

export default function GiftPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* 背景光效 */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-green-900/20 rounded-full blur-[100px] pointer-events-none" />

      {/* 顶部导航 */}
      <nav className="absolute top-0 left-0 w-full p-6 z-10">
        <Link href="/secret" className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> 返回密室
        </Link>
      </nav>

      <div className="text-center mb-12 z-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-green-400">
          加入核心社区
        </h1>
        <p className="text-slate-400">请选择一种方式联系我们</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl z-10">
        
        {/* --- 1. Discord 邀请卡片 --- */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="h-full"
        >
          <a href={DISCORD_LINK} target="_blank" rel="noreferrer" className="block h-full">
            <Card className="h-full bg-[#5865F2]/10 border-[#5865F2]/30 hover:bg-[#5865F2]/20 hover:border-[#5865F2] transition-all cursor-pointer group flex flex-col items-center justify-center py-10">
              <div className="bg-[#5865F2] p-6 rounded-full mb-6 shadow-lg shadow-[#5865F2]/30 group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Discord Server</h2>
              <p className="text-[#5865F2] font-medium group-hover:underline decoration-2 underline-offset-4">
                点击加入频道 &rarr;
              </p>
            </Card>
          </a>
        </motion.div>

        {/* --- 2. 微信二维码卡片 --- */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="h-full"
        >
          <Card className="h-full bg-green-900/10 border-green-500/30 hover:border-green-500/60 transition-all group flex flex-col items-center justify-center py-8">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-green-400 mb-4 font-bold">
                <ScanLine className="w-5 h-5" /> 微信扫一扫
              </div>
              
              {/* 二维码展示区 */}
              <div className="w-48 h-48 bg-white p-2 rounded-xl overflow-hidden shadow-lg shadow-green-900/20">
                {/* 这里的 /wechat.png 对应你放在 public 文件夹里的图片 */}
                <img 
                  src="/Wechat.png" 
                  alt="WeChat QR Code" 
                  className="w-full h-full object-contain"
                />
              </div>
              
              <p className="text-slate-500 text-xs mt-4 group-hover:text-green-400/80 transition-colors">
                验证暗号: KIKI-NFT
              </p>
            </div>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}