'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { Rocket, Wallet, Layers, ArrowRight, Github } from 'lucide-react'; // 新增 Github 图标
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 动画配置
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-purple-500/30">
      
      {/* --- 背景特效层 --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen" />
        {/* 网格背景 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      {/* --- 导航栏 --- */}
      <nav className="relative z-50 border-b border-white/10 bg-black/20 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              NFT Nexus
            </span>
          </div>
          
          {/* RainbowKit 按钮 */}
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const ready = mounted;
              const connected = ready && account && chain;
              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    'style': { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <Button onClick={openConnectModal} className="bg-white text-black hover:bg-gray-200 font-bold">
                          连接钱包
                        </Button>
                      );
                    }
                    if (chain.unsupported) {
                      return (
                        <Button variant="destructive" onClick={openChainModal}>
                          网络错误
                        </Button>
                      );
                    }
                    return (
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={openChainModal} className="border-white/20 bg-black/50 text-white hover:bg-white/10 backdrop-blur-md">
                          {chain.name}
                        </Button>
                        <Button onClick={openAccountModal} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white border-0">
                          {account.displayName}
                          {account.displayBalance ? ` (${account.displayBalance})` : ''}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </nav>

      {/* --- 主要内容区域 --- */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-32">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            Web3 从这里开始
          </motion.div>

          <motion.h1 
            {...fadeInUp}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/50"
          >
            探索下一代 <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">数字资产经济</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed"
          >
            不需要复杂的设置。连接你的钱包，即可体验最流畅的 NFT 铸造、交易与展示平台。由 React 18 与 Wagmi 驱动。
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-4"
          >
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8 text-lg bg-white text-black hover:bg-gray-200">
                开始探索 <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            
            {/* 修改了这里：跳转到 GitHub 仓库 */}
            <Link href="https://github.com/miaojiayi123/nft-web" target="_blank">
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg border-white/20 bg-transparent text-white hover:bg-white/10">
                <Github className="mr-2 w-5 h-5" /> 查看仓库
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* 特性卡片 (Grid) */}
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <FeatureCard 
            icon={<Wallet className="w-8 h-8 text-purple-400" />}
            title="多钱包支持"
            desc="完美集成 RainbowKit，支持 MetaMask, WalletConnect, Coinbase 等主流钱包。"
          />
          <FeatureCard 
            icon={<Layers className="w-8 h-8 text-blue-400" />}
            title="极速交互"
            desc="基于 Wagmi Hooks 构建，提供最快、最稳定的链上数据读写体验。"
          />
          <FeatureCard 
            icon={<Rocket className="w-8 h-8 text-pink-400" />}
            title="即刻铸造"
            desc="一键调用智能合约，体验丝滑的 NFT 铸造流程，不错过任何 Alpha。"
          />
        </motion.div>

      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <motion.div variants={fadeInUp}>
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:bg-slate-800/50 transition-colors duration-300">
        <CardHeader>
          <div className="mb-4 p-3 bg-slate-800/50 w-fit rounded-xl border border-slate-700">
            {icon}
          </div>
          <CardTitle className="text-xl text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 leading-relaxed">
            {desc}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}