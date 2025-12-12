'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Gift, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 🔴 请替换为你刚刚部署的【新】代币合约地址
const TOKEN_CONTRACT = '0x83F7A90486697B8B881319FbADaabF337fE2c60c'; 

const tokenAbi = [
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "hasClaimed",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  }
] as const;

export default function ClaimButton() {
  const { address, isConnected } = useAccount();
  
  // 1. 读取用户是否已领取
  const { data: hasClaimed, refetch } = useReadContract({
    address: TOKEN_CONTRACT as `0x${string}`,
    abi: tokenAbi,
    functionName: 'hasClaimed',
    args: address ? [address] : undefined,
  });

  // 2. 写入合约 (领取)
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // 领取成功后刷新状态
  useEffect(() => {
    if (isConfirmed) {
      refetch();
    }
  }, [isConfirmed, refetch]);

  const handleClaim = () => {
    writeContract({
      address: TOKEN_CONTRACT as `0x${string}`,
      abi: tokenAbi,
      functionName: 'claim',
    });
  };

  if (!isConnected) return null; // 未连接钱包时不显示

  return (
    <div className="flex flex-col items-center">
      <AnimatePresence mode="wait">
        {hasClaimed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 font-bold text-sm"
          >
            <CheckCircle2 className="w-4 h-4" /> 
            已领取 100 KIKI
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Button 
              size="lg"
              onClick={handleClaim}
              disabled={isPending || isConfirming}
              className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold border-0 shadow-lg shadow-yellow-500/20"
            >
              {isPending || isConfirming ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 领取中...</>
              ) : (
                <><Gift className="w-4 h-4 mr-2" /> 免费领取 100 $KIKI</>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 交易哈希提示 */}
      {isConfirmed && !hasClaimed && (
        <p className="text-xs text-green-400 mt-2 animate-pulse">
          交易成功！代币即将到账
        </p>
      )}
    </div>
  );
}