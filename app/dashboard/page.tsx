'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { 
  Wallet, Box, Scale, Rocket, Database, Zap, Store, 
  TrendingUp, Layers, Wifi, ChevronRight, ArrowLeft, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import TokenBalance from '@/components/TokenBalance';

// 直接引入原有的页面组件
import CouncilPage from '../council/page';
import MintPage from '../mint/page';
import TrainingPage from '../training/page';
import ClinicPage from '../clinic/page';
import MarketPage from '../market/page';
import DeFiPage from '../defi/page';
import TransferPage from '../transfer/page';

const NAV_ITEMS = [
  { id: 'council', label: 'Governance', icon: Scale },
  { id: 'genesis', label: 'Genesis Mint', icon: Rocket },
  { id: 'staking', label: 'Yield Farming', icon: Database }, 
  { id: 'clinic', label: 'Cyber Clinic', icon: Zap }, 
  { id: 'market', label: 'Black Market', icon: Store },
  { id: 'defi', label: 'DeFi Hub', icon: TrendingUp },
  { id: 'assets', label: 'My Assets', icon: Layers },
];

export default function Dashboard() {
  const { isConnected, chain } = useAccount(); // 获取链信息
  const [activeSection, setActiveSection] = useState('council');
  const [isClient, setIsClient] = useState(false); // 解决 Hydration 问题
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 防止服务端渲染不一致
  useEffect(() => { setIsClient(true) }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. 等待客户端挂载
  if (!isClient) return <div className="min-h-screen bg-[#0B0C10]" />;

  // 2. 钱包未连接视图
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex flex-col items-center justify-center text-slate-300 font-sans">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
            <Wallet className="w-10 h-10 text-slate-500" />
          </div>
          <h1 className="text-4xl font-bold text-white">System Locked</h1>
          <p>Connect wallet to access the city.</p>
          <div className="flex justify-center"><ConnectButton /></div>
          <Link href="/">
             <Button variant="link" className="text-slate-500 hover:text-white mt-4">
               <ArrowLeft className="mr-2 h-4 w-4"/> Return Home
             </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#06070a] text-slate-200 font-sans flex overflow-hidden">
      
      {/* 隐藏掉子页面的 Header (通过 CSS 暴力隐藏) */}
      <style jsx global>{`
        /* 隐藏各个子页面里的 header 区域，防止重复 */
        section header { display: none !important; }
        section .min-h-screen { min-height: 100% !important; height: auto !important; }
        section { overflow: hidden; }
      `}</style>

      {/* 侧边栏 */}
      <aside className="w-64 bg-[#0B0C10] border-r border-white/5 h-screen flex-col hidden lg:flex z-50 shadow-2xl">
        <div className="p-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Box className="w-6 h-6 text-white"/>
            </div>
            <div>
              <h1 className="font-bold text-white">KikiCity</h1>
              <p className="text-[10px] text-slate-500 uppercase">Control Panel</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                activeSection === item.id 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-4 h-4" /> 
              <span className="flex-1 text-left">{item.label}</span>
              {activeSection === item.id && <ChevronRight className="w-3 h-3 opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 bg-[#0e1015]">
           <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <Wifi className="w-3 h-3"/> STATUS
              </span>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] text-green-500 font-bold">ONLINE</span>
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
           </div>
           <TokenBalance />
        </div>
      </aside>

      {/* 主内容区 */}
      <main 
        ref={scrollContainerRef}
        className="flex-1 relative z-10 h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        onScroll={(e) => {
           const scrollTop = e.currentTarget.scrollTop;
           const height = e.currentTarget.clientHeight;
           const index = Math.round(scrollTop / height);
           if (NAV_ITEMS[index]) setActiveSection(NAV_ITEMS[index].id);
        }}
      >
        {/* 🔥 关键修改：
            给每个 Page 组件加一个 key={chain?.id}
            这意味着：如果链 ID 发生变化（比如从 undefined 变为 11155111），
            React 会强制销毁并重建这些组件，触发它们的 useEffect 重新获取数据！
        */}
        
        <section id="council" className="h-screen w-full snap-start relative overflow-y-auto pt-4 px-4">
           <CouncilPage />
        </section>

        <section id="genesis" className="h-screen w-full snap-start relative overflow-y-auto pt-4 px-4">
           <MintPage key={chain?.id} /> 
        </section>

        <section id="staking" className="h-screen w-full snap-start relative overflow-y-auto pt-4 px-4">
           <TrainingPage key={chain?.id} />
        </section>

        <section id="clinic" className="h-screen w-full snap-start relative overflow-y-auto pt-4 px-4">
           <ClinicPage key={chain?.id} />
        </section>

        <section id="market" className="h-screen w-full snap-start relative overflow-y-auto pt-4 px-4">
           <MarketPage key={chain?.id} />
        </section>

        <section id="defi" className="h-screen w-full snap-start relative overflow-y-auto pt-4 px-4">
           <DeFiPage key={chain?.id} />
        </section>

        <section id="assets" className="h-screen w-full snap-start relative overflow-y-auto pt-4 px-4">
           <TransferPage key={chain?.id} />
        </section>

      </main>
    </div>
  );
}