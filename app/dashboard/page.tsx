'use client';

import { useAccount, useBalance } from 'wagmi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Wallet, 
  Activity, 
  ArrowLeft, 
  LayoutGrid, 
  Rocket, 
  ShieldCheck,
  Send,
  Database,
  Cpu,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// 引入功能组件
import { NftGallery } from '@/components/NftGallery';
import TokenBalance from '@/components/TokenBalance';

// 动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function Dashboard() {
  const { address, isConnected, chain } = useAccount();
  
  // 获取原生 ETH 余额
  const { data: balance, isLoading } = useBalance({
    address: address,
  });

  // 1. 未连接状态视图
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex flex-col items-center justify-center text-slate-300 p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10">
            <Wallet className="w-8 h-8 text-slate-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Wallet Disconnected</h1>
          <p className="text-slate-500 leading-relaxed">
            Please connect your wallet to access the asset management dashboard and on-chain tools.
          </p>
          <Link href="/">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 hover:text-white transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Protocol
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 2. 已连接状态视图
  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 selection:bg-blue-500/30 font-sans">
      
      {/* 背景底噪 (与主页一致) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        
        {/* --- Header Navigation --- */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div className="flex flex-col gap-1">
            <Link href="/" className="inline-flex items-center text-xs font-mono text-slate-500 hover:text-blue-400 transition-colors mb-2">
              <ArrowLeft className="mr-2 h-3 w-3" /> RETURN TO HOME
            </Link>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-blue-500" />
              Protocol Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-[#12141a]/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
            <TokenBalance />
            <div className="h-8 w-px bg-white/10 mx-2 hidden md:block"></div>
            <div className="hidden md:flex flex-col items-end px-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Connected As</span>
              <span className="text-xs font-bold text-white font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </div>
          </div>
        </header>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-12"
        >
          {/* --- Section 1: Network Overview (Glass Cards) --- */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <OverviewCard 
              label="NETWORK STATUS" 
              value={chain?.name || 'Unknown'} 
              subValue={`Chain ID: ${chain?.id || 'N/A'}`}
              icon={<Activity className="h-5 w-5 text-green-500" />}
            />
            <OverviewCard 
              label="NATIVE BALANCE" 
              value={isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `${parseFloat(balance?.formatted || '0').toFixed(4)}`} 
              subValue={balance?.symbol}
              icon={<Wallet className="h-5 w-5 text-blue-500" />}
            />
            <OverviewCard 
              label="ACCOUNT TIER" 
              value="Standard" 
              subValue="Verified User"
              icon={<ShieldCheck className="h-5 w-5 text-purple-500" />}
            />
          </section>

          {/* --- Section 2: Core Actions (Tools) --- */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-white tracking-wide">PROTOCOL TOOLS</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* 1. Minting Launchpad */}
              <Link href="/mint" className="lg:col-span-1 group">
                <Card className="h-full bg-gradient-to-b from-blue-900/20 to-[#12141a] border-blue-500/20 hover:border-blue-500/50 transition-all duration-300">
                  <CardContent className="p-8 flex flex-col h-full justify-between">
                    <div>
                      <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                        <Rocket className="w-6 h-6 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Genesis Launchpad</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Participate in the initial asset offering (IAO). Burn $KIKI to mint generative ERC-721 assets.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-400 font-bold mt-8 group-hover:translate-x-1 transition-transform">
                      MINT ASSETS <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* 2. Yield Farming (Staking) */}
              <Link href="/training" className="lg:col-span-1 group">
                <Card className="h-full bg-[#12141a] border-white/5 hover:border-green-500/30 transition-all duration-300">
                  <CardContent className="p-8 flex flex-col h-full justify-between">
                    <div>
                      <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition-colors">
                        <Database className="w-6 h-6 text-green-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Yield Farming</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Stake your assets to earn passive income. Current APY: <span className="text-green-400 font-mono">0.01 KIKI/s</span>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300 font-bold mt-8 group-hover:text-green-400 transition-colors">
                      MANAGE STAKE <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* 3. Utilities Grid (Transfer + Secret) */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                
                {/* Transfer */}
                <Link href="/transfer" className="flex-1 group">
                  <Card className="h-full bg-[#12141a] border-white/5 hover:border-purple-500/30 transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center shrink-0">
                        <Send className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">Asset Transfer</h4>
                        <p className="text-xs text-slate-500 mt-1">Send ERC-721 tokens safely.</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Secret Access */}
                <Link href="/secret" className="flex-1 group">
                  <Card className="h-full bg-[#12141a] border-white/5 hover:border-yellow-500/30 transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">Token Gated</h4>
                        <p className="text-xs text-slate-500 mt-1">Exclusive holder content.</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

              </div>
            </div>
          </section>

          {/* --- Section 3: Portfolio (Gallery) --- */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-5 h-5 text-slate-500" />
                <h2 className="text-lg font-bold text-white tracking-wide">PORTFOLIO</h2>
              </div>
              <span className="text-xs font-mono text-slate-500">ERC-721 STANDARD</span>
            </div>
            
            <div className="bg-[#12141a]/50 border border-white/5 rounded-2xl p-6 min-h-[400px]">
               <NftGallery />
            </div>
          </section>

          {/* --- Footer Admin Link --- */}
          <div className="pt-10 flex justify-center">
             <Link href="/admin">
               <Button variant="link" className="text-slate-700 hover:text-slate-500 text-xs font-mono">
                 [ADMIN_CONSOLE_ACCESS]
               </Button>
             </Link>
          </div>

        </motion.div>
      </div>
    </div>
  );
}

// 辅助组件：数据概览卡片
function OverviewCard({ label, value, subValue, icon }: { label: string, value: React.ReactNode, subValue?: React.ReactNode, icon: React.ReactNode }) {
  return (
    <Card className="bg-[#12141a] border-white/5 shadow-none">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{label}</span>
          {icon}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{value}</span>
          {subValue && <span className="text-sm text-slate-500 font-mono">{subValue}</span>}
        </div>
      </CardContent>
    </Card>
  )
}