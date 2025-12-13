'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, Variants } from 'framer-motion';
import { 
  ArrowRight, Github, 
  Database, Cpu, Activity, Box 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';

// --- 引入核心业务组件 ---
import MessageWall from '@/components/MessageWall'; 
import Leaderboard from '@/components/Leaderboard';
import TradeDashboard from '@/components/TradeDashboard'; // ✅ 引入刚才新建的组件
import ClaimButton from '@/components/ClaimButton'; 
import TokenBalance from '@/components/TokenBalance'; 
import { SpotlightCard } from '@/components/ui/spotlight-card'; 

// --- 动画配置 ---
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const textReveal: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", damping: 12, stiffness: 100 },
  },
};

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: "easeOut" as const }
};

export default function Home() {
  const titleWords = "Decentralized Asset Ecosystem.".split(" ");

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 selection:bg-blue-500/30 overflow-x-hidden font-sans">
      
      {/* 1. 动态背景 */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[#0B0C10]" />
        <div 
          className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-20 animate-aurora mix-blend-screen"
          style={{
            backgroundImage: `
              radial-gradient(circle at center, rgba(59, 130, 246, 0.4) 0%, transparent 50%), 
              radial-gradient(circle at center, rgba(147, 51, 234, 0.4) 0%, transparent 50%)
            `,
            backgroundSize: '80% 80%, 60% 60%',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* 2. 导航栏 */}
      <nav className="relative z-50 border-b border-white/5 bg-[#0B0C10]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
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
                      if (!connected) return <Button onClick={openConnectModal} size="sm" className="bg-white text-black hover:bg-slate-200 font-semibold rounded-full px-6">Connect Wallet</Button>;
                      if (chain.unsupported) return <Button variant="destructive" size="sm" onClick={openChainModal}>Wrong Network</Button>;
                      return <Button onClick={openAccountModal} size="sm" variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white font-mono rounded-full">{account.displayName}</Button>;
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </nav>

      {/* 3. Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-32">
        <div className="flex flex-col items-start max-w-5xl mb-32">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-blue-500/20 bg-blue-500/10 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-blue-300 text-xs font-bold tracking-widest uppercase">Live on Sepolia Testnet</span>
          </motion.div>
          
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white leading-[1.1] flex flex-wrap gap-x-4">
              {titleWords.map((word, index) => (
                <motion.span key={index} variants={textReveal} className={word === "Ecosystem." ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400" : ""}>
                  {word}
                </motion.span>
              ))}
            </h1>
          </motion.div>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }} className="text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed font-light">
            Experience the future of Web3 asset management. A full-stack experiment integrating <span className="text-white font-medium">ERC-721 issuance</span>, <span className="text-white font-medium"> dynamic staking yields</span>, and on-chain governance.
          </motion.p>

          <div className="flex flex-col gap-8 w-full sm:w-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
               <ClaimButton />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="flex flex-col sm:flex-row gap-4">
              <Link href="/dashboard"><Button size="lg" className="w-full sm:w-auto bg-white text-black hover:bg-slate-200 px-8 h-14 text-base font-bold rounded-full transition-all hover:scale-105">Launch App <ArrowRight className="ml-2 w-5 h-5" /></Button></Link>
              <Link href="https://github.com/miaojiayi123/nft-web" target="_blank"><Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 bg-white/5 hover:bg-white/10 text-white px-8 h-14 text-base rounded-full backdrop-blur-sm transition-all hover:scale-105"><Github className="mr-2 w-5 h-5" /> View Source</Button></Link>
            </motion.div>
          </div>
        </div>

        {/* 4. Protocol Mechanics */}
        <motion.div {...fadeInUp} className="mb-32">
          <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-4">
            <Cpu className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-white">Protocol Mechanics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <TechCard index="01" title="Token Faucet" subtitle="Initial Distribution" desc="Receive 100 $KIKI testnet tokens instantly to jumpstart your ecosystem journey." />
            <TechCard index="02" title="Treasury Mint" subtitle="Burn Mechanism" desc="Deflationary model. Burn 20 $KIKI to mint unique generative NFT assets." />
            <TechCard index="03" title="Staking Yield" subtitle="Passive Income" desc="Stake assets to earn 0.01 $KIKI/s APY. Real-time off-chain calculation." />
            <TechCard index="04" title="Token Gated" subtitle="Access Control" desc="Exclusive verification system unlocking private community channels." />
          </div>
        </motion.div>

        {/* --- 5. Market Data (包含交易面板 & 排行榜) --- */}
        <motion.div {...fadeInUp} className="mb-32">
          <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-4">
            <div className="flex items-center gap-4">
              <Database className="w-6 h-6 text-purple-500" />
              <h2 className="text-2xl font-bold text-white">Market Data</h2>
            </div>
            <span className="text-xs font-mono text-slate-500 uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live Sync
            </span>
          </div>
          
          {/* ✅ 嵌入：独立的交易仪表盘组件 */}
          <div className="mb-12 border border-white/10 rounded-2xl overflow-hidden bg-[#0e1015]/50 backdrop-blur-sm">
             <TradeDashboard />
          </div>
          
          {/* 排行榜组件 */}
          <Leaderboard />
        </motion.div>

        {/* 6. Activity */}
        <motion.div {...fadeInUp}>
          <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-4">
            <Activity className="w-6 h-6 text-green-500" />
            <h2 className="text-2xl font-bold text-white">On-chain Activity</h2>
          </div>
          <MessageWall />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#050608]/80 backdrop-blur-lg py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-600 font-mono">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
             <p>KIKI PROTOCOL © 2025</p>
          </div>
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

// TechCard 组件保持在文件底部，因为它只在这里用
function TechCard({ index, title, subtitle, desc }: { index: string, title: string, subtitle: string, desc: string }) {
  return (
    <SpotlightCard className="h-full group hover:bg-[#15171f] transition-colors" spotlightColor="rgba(59, 130, 246, 0.15)">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="text-xs font-mono text-slate-600 mb-4 group-hover:text-blue-500 transition-colors">
          / {index}
        </div>
        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-100 transition-colors">{title}</h3>
        <p className="text-xs text-blue-400 font-mono mb-4 uppercase tracking-wider">{subtitle}</p>
        <p className="text-sm text-slate-400 leading-relaxed mt-auto">
          {desc}
        </p>
      </CardContent>
    </SpotlightCard>
  )
}