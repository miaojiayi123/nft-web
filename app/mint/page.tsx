'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Loader2, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  Sparkles, 
  LockKeyhole,
  Rocket,
  Cpu,
  Database
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { parseEther, formatEther } from 'viem';

// ✅ 引入余额组件
import TokenBalance from '@/components/TokenBalance';

// 🔴 1. NFT 合约地址
const NFT_CONTRACT = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 

// 🔴 2. KIKI 代币合约地址
const TOKEN_CONTRACT = '0x83F7A90486697B8B881319FbADaabF337fE2c60c'; 

const MAX_SUPPLY = 100;
const MINT_PRICE = parseEther('20'); // 20 KIKI

// NFT ABI
const nftAbi = [
  { inputs: [{ name: "to", type: "address" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

// Token ABI
const tokenAbi = [
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export default function MintPage() {
  const { isConnected, chain, address } = useAccount();
  const [step, setStep] = useState<'approve' | 'mint'>('approve');
  
  const isWrongNetwork = isConnected && chain?.id !== 11155111;

  // --- 读取数据 ---
  const { data: rawSupply, refetch: refetchSupply } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`, abi: nftAbi, functionName: 'totalSupply'
  });
  const currentSupply = rawSupply ? Number(rawSupply) : 0;

  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: TOKEN_CONTRACT as `0x${string}`, abi: tokenAbi, functionName: 'balanceOf', args: address ? [address] : undefined
  });
  const kikiBalance = balanceData ? Number(formatEther(balanceData)) : 0;

  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: TOKEN_CONTRACT as `0x${string}`, abi: tokenAbi, functionName: 'allowance', 
    args: address ? [address, NFT_CONTRACT as `0x${string}`] : undefined
  });
  const currentAllowance = allowanceData ? allowanceData : 0n;

  useEffect(() => {
    if (currentAllowance >= MINT_PRICE) {
      setStep('mint');
    } else {
      setStep('approve');
    }
  }, [currentAllowance]);

  // --- 写入合约 ---
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      refetchSupply();
      refetchBalance();
      refetchAllowance(); 
    }
  }, [isConfirmed, refetchSupply, refetchBalance, refetchAllowance]);

  const handleAction = () => {
    if (step === 'approve') {
      writeContract({
        address: TOKEN_CONTRACT as `0x${string}`,
        abi: tokenAbi,
        functionName: 'approve',
        args: [NFT_CONTRACT as `0x${string}`, MINT_PRICE],
      });
    } else {
      writeContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: nftAbi,
        functionName: 'mint',
        args: [address as `0x${string}`],
      });
    }
  };

  const isInsufficientBalance = kikiBalance < 20;

  // --- 视图渲染 ---

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 selection:bg-blue-500/30 font-sans">
      
      {/* 1. 背景底噪 (与 Dashboard 保持一致) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        {/* 2. 顶部导航 (Navigation) */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-20">
          <div className="flex flex-col gap-1">
            {/* ✅ 修改点：样式改为 Dashboard 风格 */}
            <Link href="/dashboard" className="inline-flex items-center text-xs font-mono text-slate-500 hover:text-blue-400 transition-colors mb-2">
              <ArrowLeft className="mr-2 h-3 w-3" /> RETURN TO DASHBOARD
            </Link>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Rocket className="w-8 h-8 text-purple-500" />
              Genesis Launchpad
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-[#12141a]/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
            <TokenBalance />
            <ConnectButton />
          </div>
        </header>

        {/* 3. 主内容区 (Main Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* 左侧：NFT 预览 */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="relative group"
          >
            {/* 光晕装饰 */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-[#12141a] shadow-2xl">
              <img src="/kiki.png" alt="Genesis Asset" className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-105" />
              
              {/* 图片上的标签 */}
              <div className="absolute top-4 left-4">
                <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded text-[10px] font-mono border border-white/10 text-white flex items-center gap-2">
                  <Database className="w-3 h-3 text-purple-400" />
                  IPFS HOSTED
                </div>
              </div>
              <div className="absolute bottom-4 right-4">
                <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/20 flex items-center gap-2 text-white">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  Series 01
                </div>
              </div>
            </div>
          </motion.div>

          {/* 右侧：铸造控制台 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-mono text-blue-400 tracking-widest uppercase">Initial Asset Offering</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Mint Kiki Asset</h2>
              <p className="text-slate-400 leading-relaxed font-light">
                {isWrongNetwork ? (
                  <span className="text-red-400 flex items-center gap-2 bg-red-500/10 px-3 py-2 rounded border border-red-500/20">
                    <AlertCircle className="w-5 h-5" /> Switch to Sepolia Testnet.
                  </span>
                ) : (
                  "Participate in the protocol genesis. Burn 20 $KIKI to mint a generative ERC-721 asset. Staking this asset yields passive token rewards."
                )}
              </p>
            </div>

            {/* 进度条 */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-mono text-slate-500">
                <span>TOTAL MINTED</span>
                <span className="text-white">{currentSupply} / {MAX_SUPPLY}</span>
              </div>
              <Progress value={(currentSupply / MAX_SUPPLY) * 100} className="h-2 bg-[#1e212b] text-purple-500" /> 
            </div>

            {/* 核心操作卡片 */}
            <Card className="bg-[#12141a] border-white/5 backdrop-blur-sm">
              <CardContent className="p-8 space-y-8">
                
                {/* 价格展示 */}
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                  <span className="text-sm text-slate-500 font-mono">MINT PRICE</span>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-bold text-white tracking-tight">20 KIKI</span>
                      <span className="text-[10px] text-slate-500 font-mono uppercase">Burn Mechanism</span>
                    </div>
                  </div>
                </div>

                {!isConnected ? (
                  <Button disabled className="w-full bg-[#1e212b] text-slate-500 h-14 border border-white/5">
                    Wallet Not Connected
                  </Button>
                ) : (
                  <>
                    {/* 按钮逻辑 */}
                    <Button 
                      size="lg" 
                      className={`w-full text-base font-bold h-14 transition-all uppercase tracking-wide
                        ${isInsufficientBalance ? 'bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/30 cursor-not-allowed' : 
                          step === 'approve' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 
                          'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.3)]'
                        }`}
                      onClick={handleAction}
                      disabled={isPending || isConfirming || isInsufficientBalance || currentSupply >= MAX_SUPPLY}
                    >
                      {isPending || isConfirming ? (
                        <><Loader2 className="mr-2 animate-spin w-5 h-5" /> PROCESSING ON-CHAIN...</>
                      ) : isInsufficientBalance ? (
                        "INSUFFICIENT BALANCE (REQ: 20 KIKI)"
                      ) : step === 'approve' ? (
                        <><LockKeyhole className="mr-2 w-5 h-5" /> APPROVE 20 KIKI</>
                      ) : (
                        <><Rocket className="mr-2 w-5 h-5" /> MINT ASSET NOW</>
                      )}
                    </Button>

                    <div className="text-center text-[10px] font-mono text-slate-600 uppercase">
                      {step === 'approve' && !isInsufficientBalance && "Step 1/2: Approve token spend"}
                      {step === 'mint' && "Step 2/2: Confirm Mint transaction"}
                    </div>
                  </>
                )}

                {/* ✅ 改进的成功提示卡片 */}
                {isConfirmed && step === 'mint' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/5 p-4 rounded-xl border border-green-500/20 space-y-4"
                  >
                    <div className="flex items-center gap-3 text-green-400 font-bold border-b border-green-500/10 pb-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span>ASSET MINTED SUCCESSFULLY</span>
                        <span className="text-[10px] font-mono font-normal opacity-70">Payment Confirmed</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {hash && (
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${hash}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center justify-center gap-2 text-xs font-mono bg-[#0B0C10] border border-white/10 py-2 rounded hover:border-white/30 transition-colors text-slate-300"
                        >
                          <ExternalLink className="w-3 h-3" /> ETHERSCAN
                        </a>
                      )}
                      <Link href="/dashboard">
                        <div className="flex items-center justify-center gap-2 text-xs font-mono bg-[#0B0C10] border border-white/10 py-2 rounded hover:border-blue-500/50 hover:text-blue-400 transition-colors text-slate-300 cursor-pointer">
                          <Database className="w-3 h-3" /> VIEW GALLERY
                        </div>
                      </Link>
                    </div>
                  </motion.div>
                )}

              </CardContent>
            </Card>

          </motion.div>
        </div>
      </div>
    </div>
  );
}