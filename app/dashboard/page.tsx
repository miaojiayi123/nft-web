'use client';

import { useAccount, useBalance } from 'wagmi';
// ✅ 修改 1: 移除原来 Card 的引用 (因为我们不再直接用它做外壳)，或者保留 CardContent
import { CardContent } from '@/components/ui/card'; 
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
// ✅ 修改 2: 引入新创建的 SpotlightCard
import { SpotlightCard } from '@/components/ui/spotlight-card';

// 动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function Dashboard() {
  const { address, isConnected, chain } = useAccount();
  
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
      
      {/* 背景底噪 */}
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
          {/* --- Section 1: Network Overview --- */}
          {/* ✅ 修改 3: 这里也替换为 SpotlightCard，用白色光晕 */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <OverviewCard 
              label="NETWORK STATUS" 
              value={chain?.name || 'Unknown'} 
              subValue={`Chain ID: ${chain?.id || 'N/A'}`}
              icon={<Activity className="h-5 w-5 text-green-500" />}
              spotlightColor="rgba(34, 197, 94, 0.2)" // 绿色光晕
            />
            <OverviewCard 
              label="NATIVE BALANCE" 
              value={isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `${parseFloat(balance?.formatted || '0').toFixed(4)}`} 
              subValue={balance?.symbol}
              icon={<Wallet className="h-5 w-5 text-blue-500" />}
              spotlightColor="rgba(59, 130, 246, 0.2)" // 蓝色光晕
            />
            <OverviewCard 
              label="ACCOUNT TIER" 
              value="Standard" 
              subValue="Verified User"
              icon={<ShieldCheck className="h-5 w-5 text-purple-500" />}
              spotlightColor="rgba(168, 85, 247, 0.2)" // 紫色光晕
            />
          </section>

          {/* --- Section 2: Core Actions (Tools) --- */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-white tracking-wide">PROTOCOL TOOLS</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* ✅ 1. Minting Launchpad (Spotlight: Blue) */}
              <Link href="/mint" className="lg:col-span-1 group">
                <SpotlightCard className="h-full hover:bg-blue-900/5 transition-colors duration-300" spotlightColor="rgba(59, 130, 246, 0.25)">
                  <CardContent className="p-8 flex flex-col h-full justify-between">
                    <div>
                      {/* 图标背景：默认灰色，悬停变蓝 */}
                      <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors duration-300">
                        <Rocket className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors duration-300" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Genesis Launchpad</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Participate in the initial asset offering (IAO). Burn $KIKI to mint generative ERC-721 assets.
                      </p>
                    </div>
                    {/* 底部文字：默认灰色，悬停变蓝 */}
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-bold mt-8 group-hover:text-blue-400 transition-colors duration-300">
                      MINT ASSETS <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </SpotlightCard>
              </Link>

              {/* ✅ 2. Yield Farming (Spotlight: Green) */}
              <Link href="/training" className="lg:col-span-1 group">
                <SpotlightCard className="h-full hover:bg-green-900/5 transition-colors duration-300" spotlightColor="rgba(34, 197, 94, 0.25)">
                  <CardContent className="p-8 flex flex-col h-full justify-between">
                    <div>
                      <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition-colors duration-300">
                        <Database className="w-6 h-6 text-slate-400 group-hover:text-green-400 transition-colors duration-300" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Yield Farming</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Stake your assets to earn passive income. Current APY: <span className="text-green-400 font-mono">0.01 KIKI/s</span>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-bold mt-8 group-hover:text-green-400 transition-colors duration-300">
                      MANAGE STAKE <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </SpotlightCard>
              </Link>

              {/* 3. Utilities Grid */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                
                {/* Transfer (Spotlight: Purple) */}
                <Link href="/transfer" className="flex-1 group">
                  <SpotlightCard className="h-full hover:bg-purple-900/5 transition-colors duration-300" spotlightColor="rgba(168, 85, 247, 0.25)">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                        <Send className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">Asset Transfer</h4>
                        <p className="text-xs text-slate-500 mt-1">Send ERC-721 tokens safely.</p>
                      </div>
                    </CardContent>
                  </SpotlightCard>
                </Link>

                {/* Secret Access (Spotlight: Yellow) */}
                <Link href="/secret" className="flex-1 group">
                  <SpotlightCard className="h-full hover:bg-yellow-900/5 transition-colors duration-300" spotlightColor="rgba(234, 179, 8, 0.25)">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-yellow-500/20 transition-colors">
                        <ShieldCheck className="w-5 h-5 text-slate-400 group-hover:text-yellow-400 transition-colors" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">Token Gated</h4>
                        <p className="text-xs text-slate-500 mt-1">Exclusive holder content.</p>
                      </div>
                    </CardContent>
                  </SpotlightCard>
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

// 辅助组件：数据概览卡片 (也升级为 SpotlightCard)
function OverviewCard({ 
  label, 
  value, 
  subValue, 
  icon, 
  spotlightColor 
}: { 
  label: string, 
  value: React.ReactNode, 
  subValue?: React.ReactNode, 
  icon: React.ReactNode, 
  spotlightColor?: string 
}) {
  return (
    <SpotlightCard spotlightColor={spotlightColor}>
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
    </SpotlightCard>
  )
}