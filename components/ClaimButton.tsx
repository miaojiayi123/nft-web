'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Gift, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// ⚠️ 确保这里填的是你的 KIKI 代币合约地址
const TOKEN_CONTRACT_ADDRESS = '0x83F7A90486697B8B881319FbADaabF337fE2c60c';

// ABI: 只需要 mint 函数
const tokenAbi = [
  {
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export default function ClaimButton() {
  const { address, isConnected } = useAccount();
  const [hasClaimed, setHasClaimed] = useState(false);

  // Wagmi Hooks
  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // 监听成功状态
  useEffect(() => {
    if (isConfirmed) {
      setHasClaimed(true);
      // 3秒后重置状态(可选)，这里为了演示“已领取”保留状态
      // setTimeout(() => setHasClaimed(false), 5000); 
    }
  }, [isConfirmed]);

  const handleClaim = () => {
    if (!address) return;
    // 调用 mint 方法，领取 100 KIKI (注意精度，这里假设是 18 位小数)
    // 100 * 10^18
    const amount = BigInt(100) * BigInt(10) ** BigInt(18);
    
    writeContract({
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'mint',
      args: [address, amount],
    });
  };

  // 状态 1: 未连接钱包
  if (!isConnected) {
    // 这里我们稍微 hack 一下，返回一个看起来像按钮的 ConnectButton
    // 或者直接返回 null，让外层的 ConnectButton 处理
    // 为了主页美观，我们这里显示一个提示连接的假按钮，点击会触发 RainbowKit
    return (
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-200"></div>
        <div className="relative bg-black rounded-lg p-1">
           <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button 
                  onClick={openConnectModal}
                  className="w-full bg-[#0B0C10] hover:bg-[#15171f] text-white font-bold h-12 px-8 border border-white/10"
                >
                  <WalletIcon className="mr-2 w-4 h-4 text-slate-400" />
                  Connect to Claim
                </Button>
              )}
           </ConnectButton.Custom>
        </div>
      </div>
    );
  }

  // 状态 2: 已领取成功
  if (hasClaimed) {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 font-bold cursor-default"
      >
        <Check className="w-5 h-5" />
        <span>100 $KIKI Received!</span>
        {/* 漂浮的 +100 动画 */}
        <motion.span 
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: -20, opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute -top-6 right-0 text-yellow-400 font-bold text-lg"
        >
          +100
        </motion.span>
      </motion.div>
    );
  }

  // 状态 3: 正常领取 / 加载中
  return (
    <div className="relative group">
      {/* 背景流光动画 */}
      <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
      
      <Button
        size="lg"
        onClick={handleClaim}
        disabled={isPending || isConfirming}
        className="relative w-full sm:w-auto min-w-[200px] h-14 bg-[#0B0C10] hover:bg-[#15171f] border border-white/10 text-white font-bold text-lg rounded-xl overflow-hidden transition-all"
      >
        <AnimatePresence mode="wait">
          {isPending || isConfirming ? (
            <motion.div
              key="loading"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-500">
                Processing...
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Gift className="w-5 h-5 text-yellow-500 group-hover:animate-bounce" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-orange-400 to-yellow-200">
                Claim 100 $KIKI
              </span>
              <div className="ml-2 px-2 py-0.5 bg-yellow-500/10 rounded text-[10px] text-yellow-500 border border-yellow-500/20">
                FREE
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 按钮内部的高光扫过效果 */}
        {!isPending && !isConfirming && (
          <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
        )}
      </Button>

      {/* 错误提示 */}
      {writeError && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }} 
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-8 left-0 right-0 text-center text-xs text-red-400 flex items-center justify-center gap-1"
        >
          <AlertCircle className="w-3 h-3" />
          <span>Claim failed. Try again.</span>
        </motion.div>
      )}
    </div>
  );
}

// 简单的辅助图标
function WalletIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  )
}