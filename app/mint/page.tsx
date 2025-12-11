'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Minus, Plus, Rocket, Loader2, Check } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

// 模拟的 NFT 数据
const NFT_PRICE = 0.001; // ETH
const MAX_SUPPLY = 1000;

export default function MintPage() {
  const { isConnected } = useAccount();
  const [mintAmount, setMintAmount] = useState(1);
  const [progress, setProgress] = useState(13); // 初始进度

  // 模拟进度条自动增长（营造热销假象）
  useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500);
    return () => clearTimeout(timer);
  }, []);

  // 交易 Hooks
  const { data: hash, sendTransaction, isPending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // 处理铸造逻辑
  const handleMint = () => {
    const totalPrice = (NFT_PRICE * mintAmount).toString();
    
    // 这里演示向一个地址（比如开发者地址）发送 ETH 来模拟铸造费用
    // 在真实项目中，这里应该调用 useWriteContract 去调用智能合约的 mint 函数
    sendTransaction({
      to: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // Vitalik 的地址 (仅作演示，钱会转给他)
      value: parseEther(totalPrice),
    });
  };

  const increment = () => mintAmount < 5 && setMintAmount(mintAmount + 1);
  const decrement = () => mintAmount > 1 && setMintAmount(mintAmount - 1);

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-purple-500/30">
      
      {/* 简单的顶部导航 */}
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
          
          {/* 左侧：NFT 展示图 */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative group"
          >
            {/* 发光背景 */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
            
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
              {/* 这里放一张占位图，你可以换成自己的 NFT 图片链接 */}
              <img 
                src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop" 
                alt="NFT Preview" 
                className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold border border-white/20">
                主网首发
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
              <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                Genesis Pass
              </h1>
              <p className="text-xl text-slate-400">
                持有此 NFT 将获得 NFT Nexus 生态系统的终身访问权限。限量 1000 枚，永不增发。
              </p>
            </div>

            {/* 进度条 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-purple-400">已铸造 66%</span>
                <span className="text-slate-500">660 / {MAX_SUPPLY}</span>
              </div>
              <Progress value={progress} className="h-3 bg-slate-800" />
            </div>

            {/* 铸造卡片 */}
            <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-sm">
              <CardContent className="p-6 space-y-6">
                
                {/* 价格信息 */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-slate-400">单价</span>
                  <span className="text-xl font-bold">{NFT_PRICE} ETH</span>
                </div>

                {/* 数量选择器 */}
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

                {/* 总价 */}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-400">总计</span>
                  <span className="text-2xl font-bold text-purple-400">
                    {(NFT_PRICE * mintAmount).toFixed(3)} ETH
                  </span>
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
                    disabled={isPending || isConfirming}
                  >
                    {isPending ? (
                      <><Loader2 className="mr-2 animate-spin" /> 请求钱包确认...</>
                    ) : isConfirming ? (
                      <><Loader2 className="mr-2 animate-spin" /> 链上确认中...</>
                    ) : (
                      <>
                        <Rocket className="mr-2" /> 立即铸造
                      </>
                    )}
                  </Button>
                )}

                {/* 成功提示 */}
                {isConfirmed && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 text-green-400 bg-green-500/10 p-3 rounded-lg border border-green-500/20"
                  >
                    <Check className="w-5 h-5" /> 
                    <span>铸造成功！欢迎加入社区。</span>
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