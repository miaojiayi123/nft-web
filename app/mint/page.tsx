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
  ExternalLink,
  Sparkles // 换个魔法星星图标
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

// --- ⚠️⚠️⚠️ 请在这里填入你【最新部署】的合约地址 ⚠️⚠️⚠️ ---
const CONTRACT_ADDRESS = '请把你的新合约地址粘贴在这里'; 

const MAX_SUPPLY = 100; // 琪琪系列限量 100
const DISPLAY_OFFSET = 0; // 新合约从 0 开始

// 合约 ABI
const contractAbi = [
  {
    inputs: [{ name: "to", type: "address" }],
    name: "mint",
    outputs: [], // 注意：有些简单的 mint 可能没有返回值，或者返回 id，这里设为空比较通用
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
  const { isConnected, chain, address } = useAccount();
  const [mintAmount, setMintAmount] = useState(1);
  
  // 检查网络 (Sepolia)
  const isWrongNetwork = isConnected && chain?.id !== 11155111;

  // 1. 读取实时铸造量
  const { 
    data: rawSupply, 
    refetch: refetchSupply,
    isLoading: isReading 
  } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`, // 强制类型转换防止报错
    abi: contractAbi,
    functionName: 'totalSupply',
    query: {
      refetchInterval: 3000, 
    }
  });

  // 计算显示数值
  const currentSupply = rawSupply ? Math.max(0, Number(rawSupply) - DISPLAY_OFFSET) : 0;
  const progressPercentage = Math.min(100, (currentSupply / MAX_SUPPLY) * 100);

  // 2. 写合约 Hook
  const { data: hash, writeContract, isPending } = useWriteContract();

  // 3. 等待交易确认
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

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
    if (!address) return;

    // 调用 mint
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: contractAbi,
      functionName: 'mint',
      args: [address],
    });
  };

  const increment = () => mintAmount < 5 && setMintAmount(mintAmount + 1);
  const decrement = () => mintAmount > 1 && setMintAmount(mintAmount - 1);

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-red-500/30">
      
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
          
          {/* 左侧：琪琪主题展示图 */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative group"
          >
            {/* 红色发光背景 (琪琪的蝴蝶结颜色) */}
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
              {/* 这里放一张动漫风格的占位图，或者你可以填入 ipfs://... 的 http 链接 */}
              <img 
                src="https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1000&auto=format&fit=crop" 
                alt="Magic Delivery" 
                className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold border border-white/20 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                Magic Collection
              </div>
            </div>
          </motion.div>

          {/* 右侧：铸造控制面板 */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            <div>
              <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
                Kiki's Delivery
              </h1>
              <p className="text-xl text-slate-400">
                {isWrongNetwork ? (
                  <span className="text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> 请切换到 Sepolia 网络开启魔法之旅。
                  </span>
                ) : (
                  "限量 100 份魔法快递 NFT。每一份都包含独特的琪琪画像，存储于 IPFS 永不消失。"
                )}
              </p>
            </div>

            {/* 进度条 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-red-400 flex items-center gap-2">
                  {isReading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `已送达 ${currentSupply} 份`
                  )}
                </span>
                <span className="text-slate-500">{currentSupply} / {MAX_SUPPLY}</span>
              </div>
              {/* 进度条颜色改成红色系 */}
              <Progress value={progressPercentage} className="h-3 bg-slate-800 text-red-500" /> 
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
                  <div className="flex items-center gap-4 bg-black/30 p-1 rounded-lg border border-slate-700 opacity-50 cursor-not-allowed">
                    <Button variant="ghost" size="icon" disabled className="h-8 w-8">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-bold text-lg">1</span>
                    <Button variant="ghost" size="icon" disabled className="h-8 w-8">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 按钮 */}
                {!isConnected ? (
                  <div className="w-full bg-slate-800 py-3 rounded-lg text-center text-slate-400">
                    请先连接钱包
                  </div>
                ) : (
                  <Button 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-lg font-bold h-14"
                    onClick={handleMint}
                    disabled={
                      isPending || 
                      isConfirming || 
                      isWrongNetwork || 
                      currentSupply >= MAX_SUPPLY
                    }
                  >
                    {isPending ? (
                      <><Loader2 className="mr-2 animate-spin" /> 正在准备扫帚...</>
                    ) : isConfirming ? (
                      <><Loader2 className="mr-2 animate-spin" /> 魔法正在生效...</>
                    ) : currentSupply >= MAX_SUPPLY ? (
                      "已售罄"
                    ) : (
                      <>
                        <Sparkles className="mr-2 fill-yellow-200 text-yellow-200" /> 立即铸造 (Mint)
                      </>
                    )}
                  </Button>
                )}

                {/* 成功反馈 */}
                {isConfirmed && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 p-4 rounded-lg border border-green-500/20 text-center space-y-3"
                  >
                    <div className="flex items-center justify-center gap-2 text-green-400 font-bold">
                      <Check className="w-5 h-5" /> 
                      <span>铸造成功！琪琪已出发</span>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-relaxed">
                      交易已确认。因为图片存储在 IPFS，<br/>
                      请等待 1-2 分钟让魔法生效 (Alchemy 索引数据)。
                    </p>

                    {hash && (
                      <div className="py-2">
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${hash}#eventlog`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" /> 
                          在 Etherscan 查看交易详情
                        </a>
                      </div>
                    )}

                    <div className="flex justify-center gap-4 text-sm border-t border-green-500/20 pt-3">
                      <Link href="/dashboard">
                        <span className="text-green-400 hover:underline cursor-pointer font-medium">
                          去我的收藏夹 &rarr;
                        </span>
                      </Link>
                      <span 
                        onClick={() => refetchSupply()} 
                        className="text-slate-400 hover:text-white cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        <RefreshCcw className="w-3 h-3" /> 刷新数据
                      </span>
                    </div>
                  </motion.div>
                )}

              </CardContent>
            </Card>

          </motion.div>
        </div>
      </main>
    </div>
  );
}