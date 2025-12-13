'use client';

import { useAccount, useBalance, useBlockNumber } from 'wagmi';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Wallet, 
  ArrowLeft, 
  Rocket, 
  ShieldCheck,
  Database,
  ArrowRight,
  Wifi,
  Layers,
  Box,
  Home,
  TrendingUp, // DeFi 图标
  Send        // 转账 图标
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// 引入组件
import { NftGallery } from '@/components/NftGallery';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import TokenBalance from '@/components/TokenBalance'; 
import ActivityLog from '@/components/ActivityLog'; 

// 滚动进场动画包装器
const ScrollSection = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: "-100px" }} 
      transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 0.9], delay }} 
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

export default function Dashboard() {
  const { isConnected, chain, address } = useAccount();
  const { data: ethBalance, isLoading: isEthLoading } = useBalance({ address });
  const { data: blockNumber } = useBlockNumber({ watch: true });

  // --- 1. 未连接状态视图 ---
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex flex-col items-center justify-center text-slate-300 p-4 font-sans">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10 shadow-2xl shadow-blue-900/20">
            <Wallet className="w-10 h-10 text-slate-500" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Access Dashboard</h1>
          <p className="text-slate-500 leading-relaxed text-lg">
            Connect your wallet to view your asset portfolio and interact with the Kiki Protocol ecosystem.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
          <Link href="/">
            <Button variant="link" className="text-slate-500 hover:text-white transition-colors mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Return to Protocol Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // --- 2. 已连接状态视图 ---
  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 selection:bg-blue-500/30 font-sans overflow-x-hidden">
      
      {/* 背景底噪 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/5 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[10s]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20">
        
        {/* --- Header (Sticky & Glassy) --- */}
        <header className="sticky top-4 z-50 flex items-center justify-between bg-[#0B0C10]/80 backdrop-blur-xl border border-white/5 p-3 rounded-2xl mb-20 shadow-2xl transition-all">
          <div className="flex items-center gap-4">
            <Link href="/" className="group">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                <Home className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </div>
            </Link>
            <div className="h-6 w-px bg-white/10 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                 <Box className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                 <span className="text-sm font-bold text-white leading-tight">Dashboard</span>
                 <span className="text-[10px] text-slate-500 font-mono uppercase">V2.1.0</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <TokenBalance />
             <div className="h-6 w-px bg-white/10 mx-2 hidden md:block"></div>
             <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </header>

        <div className="space-y-24">
          
          {/* --- Section 1: Network & Assets Overview --- */}
          <section className="space-y-8">
            <ScrollSection>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-tight">
                Network & <br /> 
                <span className="text-slate-500">Asset Overview</span>
              </h2>
            </ScrollSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Network Status */}
              <ScrollSection delay={0.1}>
                <SpotlightCard className="h-full min-h-[240px]" spotlightColor="rgba(34, 197, 94, 0.15)">
                  <CardContent className="p-8 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                      <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                        <svg className="w-8 h-8 text-green-500" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 2L2 25L16 30L30 25L16 2Z" fill="currentColor" fillOpacity="0.2"/>
                          <path d="M16 2L16 30L30 25L16 2Z" fill="currentColor" fillOpacity="0.4"/>
                          <path d="M16 22L2 25L16 30L16 22Z" fill="currentColor"/>
                          <path d="M16 2V12L30 25L16 2Z" fill="currentColor" fillOpacity="0.6"/>
                        </svg>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Online</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">{chain?.name || 'Unknown Network'}</h3>
                      <div className="space-y-1">
                         <p className="text-sm text-slate-500 font-mono">ID: {chain?.id}</p>
                         <div className="flex items-center gap-2 text-sm text-slate-500 font-mono">
                           <Wifi className="w-4 h-4" /> 
                           Block: <span className="text-slate-300">{blockNumber?.toString() || 'Syncing...'}</span>
                         </div>
                      </div>
                    </div>
                  </CardContent>
                </SpotlightCard>
              </ScrollSection>

              {/* Wallet Assets (ETH) */}
              <ScrollSection delay={0.2}>
                <SpotlightCard className="h-full min-h-[240px]" spotlightColor="rgba(59, 130, 246, 0.15)">
                  <CardContent className="p-8 flex flex-col justify-between h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <Wallet className="w-5 h-5 text-blue-500" />
                      <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Native Balance</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors my-auto">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/></svg>
                        </div>
                        <div>
                          <div className="text-white font-bold text-lg">Ethereum</div>
                          <div className="text-slate-500 text-xs font-mono">Sepolia Testnet</div>
                        </div>
                      </div>
                      <div className="text-right">
                          <div className="text-white font-bold font-mono text-xl">
                            {isEthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : parseFloat(ethBalance?.formatted || '0').toFixed(4)}
                          </div>
                          <div className="text-slate-500 text-sm font-bold">{ethBalance?.symbol}</div>
                      </div>
                    </div>
                    <div></div>
                  </CardContent>
                </SpotlightCard>
              </ScrollSection>
            </div>
          </section>

          {/* --- Section 2: Protocol Actions --- */}
          <section className="space-y-8">
            <ScrollSection>
              <div className="border-t border-white/5 pt-12">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                  Protocol <span className="text-slate-500">Actions</span>
                </h2>
                <p className="text-slate-400 max-w-2xl text-lg">
                  Interact with the core smart contracts. Mint assets, earn yield, and trade liquidity.
                </p>
              </div>
            </ScrollSection>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Mint */}
              <ScrollSection delay={0.1}>
                <Link href="/mint" className="block h-full group">
                  <SpotlightCard className="h-full hover:bg-blue-900/5 transition-all duration-500" spotlightColor="rgba(59, 130, 246, 0.3)">
                    <CardContent className="p-10 flex flex-col items-start justify-between h-full min-h-[300px]">
                      <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                        <Rocket className="w-7 h-7 text-blue-400" />
                      </div>
                      <div className="space-y-2 mb-8">
                        <h3 className="text-3xl font-bold text-white">Genesis Mint</h3>
                        <p className="text-slate-400 leading-relaxed">
                           Participate in the IAO. Burn $KIKI to generate unique NFT assets.
                        </p>
                      </div>
                      <div className="mt-auto flex items-center gap-3 text-sm font-bold text-blue-400 group-hover:translate-x-2 transition-transform">
                        START MINTING <ArrowRight className="w-4 h-4" />
                      </div>
                    </CardContent>
                  </SpotlightCard>
                </Link>
              </ScrollSection>

              {/* 2. Stake */}
              <ScrollSection delay={0.2}>
                <Link href="/training" className="block h-full group">
                  <SpotlightCard className="h-full hover:bg-green-900/5 transition-all duration-500" spotlightColor="rgba(34, 197, 94, 0.3)">
                    <CardContent className="p-10 flex flex-col items-start justify-between h-full min-h-[300px]">
                      <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                        <Database className="w-7 h-7 text-green-400" />
                      </div>
                      <div className="space-y-2 mb-8">
                        <h3 className="text-3xl font-bold text-white">Yield Farming</h3>
                        <p className="text-slate-400 leading-relaxed">
                           Stake your assets to provide liquidity and earn passive income (0.01 KIKI/s).
                        </p>
                      </div>
                      <div className="mt-auto flex items-center gap-3 text-sm font-bold text-green-400 group-hover:translate-x-2 transition-transform">
                        MANAGE STAKE <ArrowRight className="w-4 h-4" />
                      </div>
                    </CardContent>
                  </SpotlightCard>
                </Link>
              </ScrollSection>
              
              {/* --- Utilities Row: 3列布局 (DeFi, Transfer, Secret) --- */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                 
                 {/* 3. DeFi Hub (新增) */}
                 <ScrollSection delay={0.3}>
                   <Link href="/defi" className="block group h-full">
                     <SpotlightCard className="hover:bg-indigo-900/5 transition-colors h-full" spotlightColor="rgba(99, 102, 241, 0.25)">
                       <CardContent className="p-6 flex flex-col gap-4 h-full">
                         <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                           <TrendingUp className="w-6 h-6 text-indigo-400" />
                         </div>
                         <div>
                           <h4 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">DeFi Hub</h4>
                           <p className="text-xs text-slate-500">Swap KIKI/ETH & Liquidity.</p>
                         </div>
                       </CardContent>
                     </SpotlightCard>
                   </Link>
                 </ScrollSection>

                 {/* 4. Transfer (恢复) */}
                 <ScrollSection delay={0.4}>
                   <Link href="/transfer" className="block group h-full">
                     <SpotlightCard className="hover:bg-purple-900/5 transition-colors h-full" spotlightColor="rgba(168, 85, 247, 0.25)">
                       <CardContent className="p-6 flex flex-col gap-4 h-full">
                         <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                           <Send className="w-6 h-6 text-purple-400" />
                         </div>
                         <div>
                           <h4 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">Transfer</h4>
                           <p className="text-xs text-slate-500">Send assets securely.</p>
                         </div>
                       </CardContent>
                     </SpotlightCard>
                   </Link>
                 </ScrollSection>

                 {/* 5. Community (Secret) */}
                 <ScrollSection delay={0.5}>
                   <Link href="/secret" className="block group h-full">
                     <SpotlightCard className="hover:bg-yellow-900/5 transition-colors h-full" spotlightColor="rgba(234, 179, 8, 0.25)">
                       <CardContent className="p-6 flex flex-col gap-4 h-full">
                         <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                           <ShieldCheck className="w-6 h-6 text-yellow-400" />
                         </div>
                         <div>
                           <h4 className="text-lg font-bold text-white group-hover:text-yellow-300 transition-colors">Community</h4>
                           <p className="text-xs text-slate-500">Governance & Chat.</p>
                         </div>
                       </CardContent>
                     </SpotlightCard>
                   </Link>
                 </ScrollSection>
              </div>

            </div>
          </section>

          {/* --- Section 3: Portfolio (Gallery) --- */}
          <section className="space-y-8">
            <ScrollSection>
               <div className="border-t border-white/5 pt-12 flex items-end justify-between mb-8">
                 <div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                      Asset <span className="text-slate-500">Portfolio</span>
                    </h2>
                 </div>
                 <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-500 uppercase">
                    <Layers className="w-4 h-4" />
                    <span>ERC-721 Standard</span>
                 </div>
               </div>
            </ScrollSection>

            <ScrollSection delay={0.2}>
              <div className="bg-[#12141a]/30 border border-white/5 rounded-3xl p-8 min-h-[400px] backdrop-blur-sm">
                 <NftGallery />
              </div>
            </ScrollSection>
          </section>

          {/* --- Section 4: Transaction History --- */}
          <section className="space-y-8 pb-12">
            <ScrollSection>
               <div className="border-t border-white/5 pt-12 mb-8">
                  <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                    Transaction <span className="text-slate-500">History</span>
                  </h2>
               </div>
            </ScrollSection>

            <ScrollSection delay={0.2}>
              <ActivityLog />
            </ScrollSection>
          </section>

          {/* --- Footer Admin Link --- */}
          <div className="flex justify-center pb-10 opacity-50 hover:opacity-100 transition-opacity">
             <Link href="/admin">
               <Button variant="link" className="text-slate-600 font-mono text-xs uppercase tracking-widest">
                 /// Admin Console Access ///
               </Button>
             </Link>
          </div>

        </div>
      </div>
    </div>
  );
}