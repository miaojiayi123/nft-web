'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { Loader2 } from 'lucide-react';

// 🔴 你的 KIKI 代币合约地址
const TOKEN_CONTRACT = '0x83F7A90486697B8B881319FbADaabF337fE2c60c';

const tokenAbi = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default function TokenBalance() {
  const { address, isConnected } = useAccount();

  // 读取余额
  const { data: balance, isLoading } = useReadContract({
    address: TOKEN_CONTRACT as `0x${string}`,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    // 自动刷新配置：每 5 秒更新一次余额，保证 Mint 或领取后数据及时变动
    query: {
        refetchInterval: 5000 
    }
  });

  // 如果没连接钱包，不显示任何东西
  if (!isConnected) return null;

  return (
    <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-yellow-500/20 px-4 py-2 rounded-full backdrop-blur-md shadow-lg shadow-yellow-500/5 transition-all hover:scale-105 hover:border-yellow-500/40">
      {/* Kiki 图标 */}
      <img 
        src="/kiki.png" 
        alt="KIKI" 
        className="w-5 h-5 object-contain drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" 
      />
      
      {/* 余额数字 */}
      <span className="font-mono font-bold text-yellow-400 text-sm">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin inline" />
        ) : (
          // 格式化数字：保留整数，加千分位
          Math.floor(Number(formatEther(balance || 0n))).toLocaleString()
        )}
      </span>
      <span className="text-xs text-yellow-600/80 font-bold">KIKI</span>
    </div>
  );
}