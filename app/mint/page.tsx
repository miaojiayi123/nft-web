'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Minus, 
  Plus, 
  Rocket, 
  Loader2, 
  Check, 
  AlertCircle, 
  RefreshCcw, 
  ExternalLink // <--- 确保引入了这个图标
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

// --- 配置区域 ---
const CONTRACT_ADDRESS = '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2'; // Sepolia 测试合约
const MAX_SUPPLY = 100; // 限额

// 偏移量：用于让页面看起来是从 0 开始铸造的
// 如果你想显示真实的链上总数，把这里改成 0
const DISPLAY_OFFSET = 33340; 

const contractAbi = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default function MintPage() {
  const { isConnected, chain } = useAccount();
  const [mintAmount, setMintAmount] = useState(1);
  
  // 检查是否在 Sepolia 网络
  const isWrongNetwork = isConnected && chain?.id !== 11155111;

  // 1. 读取链上实时数据
  const { 
    data: rawSupply, 
    refetch: refetchSupply,
    isLoading: isReading 
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractAbi,
    functionName: 'totalSupply',
    query: {
      refetchInterval: 5000, 
    }
  });

  // 计算显示的数值
  const currentSupply = rawSupply ? Number(rawSupply) - DISPLAY_OFFSET : 0;
  const displayCount = Math.max(0, currentSupply);
  const progressPercentage = Math.min(100, (displayCount / MAX_SUPPLY) * 100);

  // 2. 写合约 Hook
  const { data: hash, writeContract, isPending } = useWriteContract();

  // 3. 等待交易确认 Hook
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // 4. 监听交易成功 -> 刷新数据
  useEffect(() => {
    if (isConfirmed) {
      refetchSupply();
    }
  }, [isConfirmed, refetchSupply]);

  const handleMint = () => {
    if (isWrongNetwork) {
      alert("请切换到 Sepolia 测试网！");
      return;
    }
    const randomTokenId = BigInt(Date.now() + Math.floor(Math.random() * 10000));
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: contractAbi,
      functionName: 'mint',
      args: [randomTokenId],
    });
  };

  const increment = () => mintAmount < 5 && setMintAmount(mintAmount + 1);
  const decrement = () => mintAmount > 1 && setMintAmount(mintAmount - 1);

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-purple-500/30">
      
      {/* 顶部导航 */}
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> 返回控制台
            </Button>
          </Link>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* 左侧：NFT 展示 */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1000&auto=format&fit=crop" 
                alt="NFT Preview" 
                className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold border border-white/20 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                实时数据
              </div>
            </div>
          </motion.div>

          {/* 右侧：控制面板 */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            <div>
              <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                Genesis Pass
              </h1>
              <p className="text-xl text-slate-400">
                {isWrongNetwork ? (
                  <span className="text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> 请切换到 Sepolia 网络加载实时数据。
                  </span>
                ) : (
                  "数据直连区块链。所有铸造行为都会实时反映在进度条上。"
                )}
              </p>
            </div>

            {/* 进度条区域 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-purple-400 flex items-center gap-2">
                  {isReading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `已铸造 ${displayCount}`
                  )}
                </span>
                <span className="text-slate-500">{displayCount} / {MAX_SUPPLY}</span>
              </div>
              <Progress value={progressPercentage} className="h-3 bg-slate-800" />
            </div>

            {/* 铸造卡片 */}
            <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-sm">
              <CardContent className="p-6 space-y-6">
                
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-slate-400">价格</span>
                  <span className="text-xl font-bold text-green-400">免费 (Free Mint)</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">选择数量</span>
                  <div className="flex items-center gap-4 bg-black/30 p-1 rounded-lg border border-slate-700">
                    <Button variant="ghost" size="icon" onClick={decrement} className="h-8 w-8 hover:bg-white/10">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-bold text-lg">{mintAmount}</span>
                    <Button variant="ghost" size="icon" onClick={increment} className="h-8 w-8 hover:bg-white/10">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 铸造按钮 */}
                {!isConnected ? (
                  <div className="w-full bg-slate-800 py-3 rounded-lg text-center text-slate-400">
                    请先连接钱包
                  </div>
                ) : (
                  <Button 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg font-bold h-14"
                    onClick={handleMint}
                    disabled={isPending || isConfirming || isWrongNetwork || displayCount >= MAX_SUPPLY}
                  >
                    {isPending ? (
                      <><Loader2 className="mr-2 animate-spin" /> 钱包确认中...</>
                    ) : isConfirming ? (
                      <><Loader2 className="mr-2 animate-spin" /> 区块确认中...</>
                    ) : displayCount >= MAX_SUPPLY ? (
                      "已售罄"
                    ) : (
                      <>
                        <Rocket className="mr-2" /> 立即铸造
                      </>
                    )}
                  </Button>
                )}

                {/* --- 成功提示 (含 Etherscan 链接) --- */}
                {isConfirmed && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 p-4 rounded-lg border border-green-500/20 text-center space-y-3"
                  >
                    <div className="flex items-center justify-center gap-2 text-green-400 font-bold">
                      <Check className="w-5 h-5" /> 
                      <span>铸造成功！</span>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-relaxed">
                      交易已上链。Alchemy 索引可能需要几分钟。<br/>
                      在此期间，你可以直接在区块链浏览器上查看确据。
                    </p>

                    {/* Etherscan 链接 */}
                    {hash && (
                      <div className="py-2">
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${hash}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" /> 
                          在 Sepolia Etherscan 查看交易详情
                        </a>
                      </div>
                    )}

                    <div className="flex justify-center gap-4 text-sm border-t border-green-500/20 pt-3">
                      <Link href="/dashboard">
                        <span className="text-green-400 hover:underline cursor-pointer font-medium">
                          返回收藏夹 &rarr;
                        </span>
                      </Link>
                      <span 
                        onClick={() => refetchSupply()} 
                        className="text-slate-400 hover:text-white cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        <RefreshCcw className="w-3 h-3" /> 刷新进度
                      </span>
                    </div>
                  </motion.div>
                )}
                {/* ---------------------------------- */}

              </CardContent>
            </Card>

          </motion.div>
        </div>
      </main>
    </div>
  );
}