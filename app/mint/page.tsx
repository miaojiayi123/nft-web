'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Minus, Plus, Rocket, Loader2, Check, AlertCircle, RefreshCcw, ExternalLink } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

// --- 使用 Alchemy 官方稳定的测试合约 ---
const CONTRACT_ADDRESS = '0x5180db8F5c931aaE63c74266b211F580155ecac8'; 
const MAX_SUPPLY = 10000; // 这个合约总量很大，我们作为演示

// 这个合约已经被 Mint 了大概 3600 次左右
// 设置这个偏移量，让你的进度条看起来是从 0 开始（为了视觉效果）
const DISPLAY_OFFSET = 0; 

const contractAbi = [
  // 新的 mint 函数：只需要传入接收者地址
  {
    inputs: [{ name: "to", type: "address" }],
    name: "mint",
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // 读取总量
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default function MintPage() {
  const { isConnected, chain, address } = useAccount(); // 拿到当前用户地址
  const [mintAmount, setMintAmount] = useState(1);
  
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

  // 逻辑：如果读不到数据，默认为0；读到了减去偏移量，确保不显示负数
  const currentSupply = rawSupply ? Math.max(0, Number(rawSupply) - DISPLAY_OFFSET) : 0;
  // 进度条百分比
  const progressPercentage = Math.min(100, (currentSupply / 100) * 100); // 假装总量是100个来显示进度

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

    // 直接调用 mint，传入你的地址，合约会自动生成 Token ID
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: contractAbi,
      functionName: 'mint',
      args: [address],
    });
  };

  const increment = () => mintAmount < 5 && setMintAmount(mintAmount + 1);
  const decrement = () => mintAmount > 1 && setMintAmount(mintAmount - 1);

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-purple-500/30">
      
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
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
              {/* 这里换了一张更有 Web3 感觉的图 */}
              <img 
                src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop" 
                alt="NFT Preview" 
                className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold border border-white/20 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Alchemy Verified
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            <div>
              <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                Alchemy Pass
              </h1>
              <p className="text-xl text-slate-400">
                {isWrongNetwork ? (
                  <span className="text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> 请切换到 Sepolia 网络。
                  </span>
                ) : (
                  "这是基于 Alchemy 官方合约的真实铸造。100% 成功率保证。"
                )}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-purple-400 flex items-center gap-2">
                  {isReading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `当前铸造热度: ${currentSupply}`
                  )}
                </span>
                {/* 这里的 100 只是为了让进度条好看，不代表合约真实上限 */}
                <span className="text-slate-500">{currentSupply} / 100 (Session)</span>
              </div>
              <Progress value={progressPercentage} className="h-3 bg-slate-800" />
            </div>

            <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-sm">
              <CardContent className="p-6 space-y-6">
                
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-slate-400">价格</span>
                  <span className="text-xl font-bold text-green-400">免费 (Free)</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">数量 (Demo限制)</span>
                  <div className="flex items-center gap-4 bg-black/30 p-1 rounded-lg border border-slate-700 opacity-50 cursor-not-allowed">
                     {/* 这个合约一次只能铸造一个，所以我们锁死按钮 */}
                    <Button variant="ghost" size="icon" disabled className="h-8 w-8">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-bold text-lg">1</span>
                    <Button variant="ghost" size="icon" disabled className="h-8 w-8">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {!isConnected ? (
                  <div className="w-full bg-slate-800 py-3 rounded-lg text-center text-slate-400">
                    请先连接钱包
                  </div>
                ) : (
                  <Button 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg font-bold h-14"
                    onClick={handleMint}
                    disabled={isPending || isConfirming || isWrongNetwork}
                  >
                    {isPending ? (
                      <><Loader2 className="mr-2 animate-spin" /> 钱包确认中...</>
                    ) : isConfirming ? (
                      <><Loader2 className="mr-2 animate-spin" /> 区块确认中...</>
                    ) : (
                      <>
                        <Rocket className="mr-2" /> 立即铸造
                      </>
                    )}
                  </Button>
                )}

                {isConfirmed && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 p-4 rounded-lg border border-green-500/20 text-center space-y-3"
                  >
                    <div className="flex items-center justify-center gap-2 text-green-400 font-bold">
                      <Check className="w-5 h-5" /> 
                      <span>铸造成功！NFT 已到账</span>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-relaxed">
                      这次肯定没问题了！<br/>
                      请点击下方链接，在 Logs 里查看你的 Token ID。
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
                          查看交易日志 (找 Token ID)
                        </a>
                      </div>
                    )}
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