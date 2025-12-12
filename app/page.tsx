'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { 
  Rocket, ArrowRight, Github, 
  Database, Cpu, Activity, Lock, Box 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// --- 引入核心业务组件 ---
import MessageWall from '@/components/MessageWall'; 
import Leaderboard from '@/components/Leaderboard';
import ClaimButton from '@/components/ClaimButton'; 
import TokenBalance from '@/components/TokenBalance'; 

// --- 动画配置 ---
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 selection:bg-blue-500/30 overflow-x-hidden font-sans">
      
      {/* --- 1. 背景底噪 --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* --- 2. 顶部导航栏 --- */}
      <nav className="relative z-50 border-b border-white/5 bg-[#0B0C10]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Kiki<span className="text-blue-500">Protocol</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <TokenBalance />
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                const ready = mounted;
                const connected = ready && account && chain;
                return (
                  <div {...(!ready && { 'aria-hidden': true, 'style': { opacity: 0, pointerEvents: 'none' } })}>
                    {(() => {
                      if (!connected) {
                        return (
                          <Button onClick={openConnectModal} size="sm" className="bg-white text-black hover:bg-slate-200 font-semibold">
                            Connect Wallet
                          </Button>
                        );
                      }
                      if (chain.unsupported) {
                        return <Button variant="destructive" size="sm" onClick={openChainModal}>Wrong Network</Button>;
                      }
                      return (
                        <Button onClick={openAccountModal} size="sm" variant="outline" className="border-white/20 bg-transparent hover:bg-white/5 text-white font-mono">
                          {account.displayName}
                        </Button>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </nav>

      {/* --- 3. Hero Section --- */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-32">
        
        <div className="flex flex-col items-start max-w-4xl mb-32">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-3 py-1 mb-6 border-l-2 border-blue-500 bg-blue-500/5"
          >
            <span className="text-blue-400 text-xs font-mono uppercase tracking-widest">
              Running on Sepolia Testnet
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-white leading-[1.1]"
          >
            Decentralized <br/>
            Asset <span className="text-blue-500">Ecosystem.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-400 max-w-2xl mb-8 leading-relaxed font-light"
          >
            一个集成了 <span className="text-white">ERC-721 资产发行</span> 与 <span className="text-white">ERC-20 经济模型</span> 的全栈实验性协议。体验从 Faucet 领取、Mint 铸造到 Staking 收益的完整闭环。
          </motion.p>

          <div className="flex flex-col gap-8 w-full sm:w-auto">
            
            {/* 核心操作 1: Claim */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
               <ClaimButton />
            </motion.div>

            {/* ✅ 核心操作 2: 醒目的大按钮组 (替代了原本的小链接) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href="/dashboard">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 h-12 text-base font-bold shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:scale-105"
                >
                  Launch App <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              
              <Link href="https://github.com/miaojiayi123/nft-web" target="_blank">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto border-white/20 bg-white/5 hover:bg-white/10 text-white px-8 h-12 text-base backdrop-blur-sm transition-all hover:scale-105"
                >
                  <Github className="mr-2 w-5 h-5" /> View Contracts
                </Button>
              </Link>
            </motion.div>

          </div>
        </div>

        {/* --- 4. Protocol Mechanics --- */}
        <motion.div {...fadeInUp} className="mb-32">
          <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-4">
            <Cpu className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-white">Protocol Mechanics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <TechCard 
              index="01"
              title="Token Faucet"
              subtitle="Initial Distribution"
              desc="通过 Faucet 领取初始 100 $KIKI 测试币，作为生态系统的启动资金。"
            />
            {/* ✅ 修改点：国库回收 (Treasury Mint) */}
            <TechCard 
              index="02"
              title="Treasury Mint"
              subtitle="Revenue Recycle"
              desc="采用回收机制。铸造 NFT 需支付 20 $KIKI，代币回流至协议金库，用于后续生态激励循环。"
            />
            <TechCard 
              index="03"
              title="Staking Yield"
              subtitle="Passive Income"
              desc="质押 NFT 获得 0.01 $KIKI/s 的 APY 回报。基于时间的链上奖励算法。"
            />
            <TechCard 
              index="04"
              title="Token Gated"
              subtitle="Access Control"
              desc="基于持有权的访问控制系统。持有 NFT 即可解锁 Secret 专属板块。"
            />
          </div>
        </motion.div>

        {/* --- 5. Leaderboard --- */}
        <motion.div {...fadeInUp} className="mb-32">
          <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-4">
            <div className="flex items-center gap-4">
              <Database className="w-6 h-6 text-purple-500" />
              {/* 这里保留英文标题，和 Leaderboard 组件内部呼应 */}
              <h2 className="text-2xl font-bold text-white">Market Data</h2>
            </div>
            <span className="text-xs font-mono text-slate-500 uppercase">Real-time On-chain</span>
          </div>
          
          <Leaderboard />
        </motion.div>

        {/* --- 6. Activity --- */}
        <motion.div {...fadeInUp}>
          <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-4">
            <Activity className="w-6 h-6 text-green-500" />
            <h2 className="text-2xl font-bold text-white">On-chain Activity</h2>
          </div>
          <MessageWall />
        </motion.div>

      </main>

      {/* --- Footer --- */}
      <footer className="border-t border-white/5 bg-[#050608] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-600 font-mono">
          <p>KIKI PROTOCOL © 2025. DEPLOYED ON SEPOLIA.</p>
          <div className="flex gap-8 mt-4 md:mt-0">
            <Link href="/dashboard" className="hover:text-slate-400 transition-colors">DASHBOARD</Link>
            <Link href="/mint" className="hover:text-slate-400 transition-colors">MINT</Link>
            <Link href="/training" className="hover:text-slate-400 transition-colors">STAKE</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- TechCard 组件 ---
function TechCard({ index, title, subtitle, desc }: { index: string, title: string, subtitle: string, desc: string }) {
  return (
    <Card className="bg-[#12141a] border-white/5 hover:border-blue-500/30 transition-all duration-300 group">
      <CardContent className="p-6">
        <div className="text-xs font-mono text-slate-600 mb-4 group-hover:text-blue-500 transition-colors">
          / {index}
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-xs text-blue-400 font-mono mb-4 uppercase tracking-wider">{subtitle}</p>
        <p className="text-sm text-slate-400 leading-relaxed">
          {desc}
        </p>
      </CardContent>
    </Card>
  )
}