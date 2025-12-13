'use client';

import { useAccount, useReadContract } from 'wagmi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Lock, 
  Unlock, 
  Gem, 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle, 
  Wallet, 
  Loader2,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';

// ✅ 引入余额组件 (保持头部一致性)
import TokenBalance from '@/components/TokenBalance';

// NFT 合约地址
const CONTRACT_ADDRESS = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 

// ABI: 只需查询余额
const contractAbi = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default function SecretPage() {
  const { address, isConnected } = useAccount();

  // 读取当前用户持有的 NFT 数量
  const { data: balance, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      refetchOnWindowFocus: true,
    }
  });

  const hasNft = balance && Number(balance) > 0;

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 selection:bg-purple-500/30 font-sans flex flex-col">
      
      {/* 1. 背景底噪 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>
      
      {/* 2. 顶部导航 */}
      <nav className="relative z-10 w-full p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex flex-col gap-1">
          <Link href="/dashboard" className="inline-flex items-center text-xs font-mono text-slate-500 hover:text-blue-400 transition-colors mb-1 uppercase tracking-wide">
            <ArrowLeft className="mr-2 h-3 w-3" /> RETURN TO DASHBOARD
          </Link>
        </div>
        
        <div className="flex items-center gap-4 bg-[#12141a]/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
          <TokenBalance />
          <ConnectButton />
        </div>
      </nav>

      {/* 3. 核心内容区 */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full max-w-lg mx-auto pb-20">
        
        {/* 标题 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-4 border border-white/5 shadow-xl">
             <ShieldCheck className="w-8 h-8 text-purple-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            Token Gated Access
          </h1>
          <p className="text-slate-400 font-light text-sm">
            Exclusive content for <span className="text-white font-mono">Genesis Asset</span> holders only.
          </p>
        </div>

        {/* 状态卡片切换 */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            
            {!isConnected ? (
              // 🔴 状态 1: 未连接钱包
              <motion.div 
                key="disconnected"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="bg-[#12141a] border-white/5 backdrop-blur-sm shadow-2xl">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                      <Wallet className="w-6 h-6 text-slate-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Verification Required</h2>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                      Please connect your wallet to verify ownership of the required NFT assets.
                    </p>
                    <div className="flex justify-center">
                       <ConnectButton />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : isLoading ? (
              // 🟡 状态 2: 读取中
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-10"
              >
                 <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-4" />
                 <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Verifying On-Chain Data...</p>
              </motion.div>
            ) : hasNft ? (
              // 🟢 状态 3: 验证通过
              <motion.div 
                key="success"
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.4 }}
              >
                <Card className="bg-[#12141a] border-purple-500/30 overflow-hidden relative shadow-[0_0_50px_rgba(168,85,247,0.15)]">
                  {/* 顶部高亮条 */}
                  <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-blue-500"></div>
                  
                  <CardContent className="p-8 text-center relative z-10">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                      <Unlock className="w-8 h-8 text-green-400" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">Access Granted</h2>
                    <p className="text-slate-400 text-sm mb-8">
                      Ownership verified. Welcome to the inner circle, Agent.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-left flex items-start gap-4 hover:bg-white/10 transition-colors cursor-pointer group">
                        <div className="bg-purple-500/20 p-2.5 rounded-lg shrink-0">
                          <Gem className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">Exclusive Community</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Access the private Discord channel and developer resources.
                          </p>
                        </div>
                      </div>

                      {/* 礼物按钮 */}
                      <Link href="/gift" className="block w-full">
                        <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-12 text-sm uppercase tracking-wide shadow-lg transition-all hover:scale-[1.02]">
                          <ExternalLink className="mr-2 w-4 h-4" /> Claim Mystery Gift
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                  
                  {/* 背景装饰光 */}
                  <div className="absolute top-0 left-0 w-full h-full bg-purple-500/5 pointer-events-none"></div>
                </Card>
              </motion.div>
            ) : (
              // 🔴 状态 4: 验证失败
              <motion.div 
                key="denied"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className="bg-[#12141a] border-red-900/30 overflow-hidden relative shadow-2xl">
                  <div className="h-1 w-full bg-red-900/50"></div>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                      <Lock className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-xs mx-auto">
                      Required asset <span className="text-white font-bold font-mono">Genesis NFT</span> not found in connected wallet.
                    </p>
                    
                    <div className="flex flex-col gap-3">
                      <Link href="/mint" className="w-full">
                        <Button className="w-full bg-white text-black hover:bg-slate-200 font-bold h-12 text-sm uppercase tracking-wide">
                           Mint Access Pass
                        </Button>
                      </Link>
                      <a href="https://opensea.io" target="_blank" className="text-xs text-slate-600 hover:text-slate-400 font-mono transition-colors mt-2 block">
                        BUY ON SECONDARY MARKET &rarr;
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}