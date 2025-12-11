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
  ExternalLink 
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

// --- 配置区域 ---
// 你的专属合约地址
const CONTRACT_ADDRESS = '0xFE0cFb89Fb6fe621Ff99a95e30ea1E60cD555e13'; 
const MAX_SUPPLY = 100; // 设置上限为 100

// 因为是你自己的新合约，所以从 0 开始显示
const DISPLAY_OFFSET = 0; 

// 合约 ABI (对应 MyNFT.sol)
const contractAbi = [
  {
    inputs: [{ name: "to", type: "address" }],
    name: "mint",
    outputs: [{ name: "tokenId", type: "uint256" }],
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
  
  // 检查网络
  const isWrongNetwork = isConnected && chain?.id !== 11155111;

  // 1. 读取实时铸造量
  const { 
    data: rawSupply, 
    refetch: refetchSupply,
    isLoading: isReading 
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractAbi,
    functionName: 'totalSupply',
    query: {
      refetchInterval: 3000, // 每3秒刷新一次，更实时
    }
  });

  // 计算显示数值
  const currentSupply = rawSupply ? Math.max(0, Number(rawSupply) - DISPLAY_OFFSET) : 0;
  // 计算进度百分比
  const progressPercentage = Math.min(100, (currentSupply / MAX_SUPPLY) * 100);

  // 2. 写合约 Hook
  const { data: hash, writeContract, isPending } = useWriteContract();

  // 3. 等待交易确认
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // 4. 交易成功后强制刷新数据
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

    // 调用你的 mint 函数
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
          
          {/* 左侧：NFT 展示图 */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
              {/* 这里的图片链接可以换成你想要展示的 NFT 预览图 */}
              <img 
                src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop" 
                alt="NFT Preview" 
                className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold border border-white/20 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Official Contract
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
              <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500">
                Nexus Genesis
              </h1>
              <p className="text-xl text-slate-400">
                {isWrongNetwork ? (
                  <span className="text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> 请切换到 Sepolia 网络参与公测。
                  </span>
                ) : (
                  "限量 100 枚创世 NFT，基于 ERC-721 标准。拥有者将获得未来空投权。"
                )}
              </p>
            </div>

            {/* 进度条 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-purple-400 flex items-center gap-2">
                  {isReading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `已铸造 ${currentSupply}`
                  )}
                </span>
                <span className="text-slate-500">
                  {currentSupply >= MAX_SUPPLY ? "已售罄" : `${currentSupply} / ${MAX_SUPPLY}`}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3 bg-slate-800" />
            </div>

            {/* 操作卡片 */}
            <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-sm">
              <CardContent className="p-6 space-y-6">
                
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-slate-400">铸造价格</span>
                  <span className="text-xl font-bold text-green-400">免费 (Free Mint)</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">数量限制</span>
                  <div className="flex items-center gap-4 bg-black/30 p-1 rounded-lg border border-slate-700 opacity-50 cursor-not-allowed">
                    {/* 你的合约每次只能 Mint 1 个，所以这里锁死为 1 */}
                    <Button variant="ghost" size="icon" disabled className="h-8 w-8">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-bold text-lg">1</span>
                    <Button variant="ghost" size="icon" disabled className="h-8 w-8">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 按钮状态逻辑 */}
                {!isConnected ? (
                  <div className="w-full bg-slate-800 py-3 rounded-lg text-center text-slate-400">
                    请先连接钱包
                  </div>
                ) : (
                  <Button 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg font-bold h-14"
                    onClick={handleMint}
                    disabled={
                      isPending || 
                      isConfirming || 
                      isWrongNetwork || 
                      currentSupply >= MAX_SUPPLY
                    }
                  >
                    {isPending ? (
                      <><Loader2 className="mr-2 animate-spin" /> 钱包确认中...</>
                    ) : isConfirming ? (
                      <><Loader2 className="mr-2 animate-spin" /> 区块确认中...</>
                    ) : currentSupply >= MAX_SUPPLY ? (
                      "已售罄 (Sold Out)"
                    ) : (
                      <>
                        <Rocket className="mr-2" /> 立即铸造 (Mint)
                      </>
                    )}
                  </Button>
                )}

                {/* 成功后的反馈 */}
                {isConfirmed && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 p-4 rounded-lg border border-green-500/20 text-center space-y-3"
                  >
                    <div className="flex items-center justify-center gap-2 text-green-400 font-bold">
                      <Check className="w-5 h-5" /> 
                      <span>恭喜！NFT 已入库</span>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-relaxed">
                      交易已确认。点击下方链接查看链上凭证。<br/>
                      Dashboard 画廊数据可能会有 1-2 分钟延迟。
                    </p>

                    {hash && (
                      <div className="py-2">
                        <a 
                          // 动态链接到你的合约和交易 Hash
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