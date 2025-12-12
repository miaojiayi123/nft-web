'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Rocket, Loader2, Check, AlertCircle, ExternalLink, Sparkles, LockKeyhole, Coins
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { parseEther, formatEther } from 'viem';

// 🔴 1. 新的 NFT 合约地址 (Payment版)
const NFT_CONTRACT = '0xb285705645BD2fEBdd4Dbea69333eF6c5ea762E0'; 

// 🔴 2. 代币合约地址 (KIKI)
const TOKEN_CONTRACT = '0x83F7A90486697B8B881319FbADaabF337fE2c60c'; 

const MAX_SUPPLY = 100;
const MINT_PRICE = parseEther('20'); // 20 KIKI

// NFT ABI (只需要 mint 和 totalSupply)
const nftAbi = [
  { inputs: [{ name: "to", type: "address" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

// Token ABI (需要 approve, allowance, balanceOf)
const tokenAbi = [
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export default function MintPage() {
  const { isConnected, chain, address } = useAccount();
  const [step, setStep] = useState<'approve' | 'mint'>('approve'); // 状态机：先授权，后铸造
  
  const isWrongNetwork = isConnected && chain?.id !== 11155111;

  // --- 读取数据 ---
  
  // 1. NFT 总量
  const { data: rawSupply, refetch: refetchSupply } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`, abi: nftAbi, functionName: 'totalSupply'
  });
  const currentSupply = rawSupply ? Number(rawSupply) : 0;

  // 2. KIKI 余额
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: TOKEN_CONTRACT as `0x${string}`, abi: tokenAbi, functionName: 'balanceOf', args: address ? [address] : undefined
  });
  const kikiBalance = balanceData ? Number(formatEther(balanceData)) : 0;

  // 3. 授权额度 (Allowance)
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: TOKEN_CONTRACT as `0x${string}`, abi: tokenAbi, functionName: 'allowance', 
    args: address ? [address, NFT_CONTRACT as `0x${string}`] : undefined
  });
  const currentAllowance = allowanceData ? allowanceData : 0n;

  // 判断是否需要授权
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

  // 交易成功后的刷新逻辑
  useEffect(() => {
    if (isConfirmed) {
      refetchSupply();
      refetchBalance();
      refetchAllowance(); // 关键：授权成功后，这里会更新，从而触发 step 变为 'mint'
    }
  }, [isConfirmed, refetchSupply, refetchBalance, refetchAllowance]);

  // 操作处理
  const handleAction = () => {
    if (step === 'approve') {
      // 执行授权
      writeContract({
        address: TOKEN_CONTRACT as `0x${string}`,
        abi: tokenAbi,
        functionName: 'approve',
        args: [NFT_CONTRACT as `0x${string}`, MINT_PRICE],
      });
    } else {
      // 执行铸造
      writeContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: nftAbi,
        functionName: 'mint',
        args: [address as `0x${string}`],
      });
    }
  };

  const isInsufficientBalance = kikiBalance < 20;

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-red-500/30">
      
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> 返回控制台
            </Button>
          </Link>
          {isConnected && (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-sm border border-slate-700">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-slate-300">余额: </span>
              <span className="font-bold text-white">{kikiBalance} KIKI</span>
            </div>
          )}
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
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
              <img src="/kiki.png" alt="Magic Delivery" className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold border border-white/20 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                Magic Collection
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
              <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
                Kiki's Delivery
              </h1>
              <p className="text-xl text-slate-400">
                {isWrongNetwork ? (
                  <span className="text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> 请切换到 Sepolia 网络。
                  </span>
                ) : (
                  "限量 100 份魔法快递 NFT。现在需要支付 20 $KIKI 才能召唤琪琪。"
                )}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-red-400">已送达 {currentSupply} 份</span>
                <span className="text-slate-500">{currentSupply} / {MAX_SUPPLY}</span>
              </div>
              <Progress value={(currentSupply / MAX_SUPPLY) * 100} className="h-3 bg-slate-800 text-red-500" /> 
            </div>

            <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-sm">
              <CardContent className="p-6 space-y-6">
                
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-slate-400">价格</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-yellow-400">20 KIKI</span>
                    <span className="text-xs text-slate-500 line-through">FREE</span>
                  </div>
                </div>

                {!isConnected ? (
                  <div className="w-full bg-slate-800 py-3 rounded-lg text-center text-slate-400">
                    请先连接钱包
                  </div>
                ) : (
                  <>
                    {/* 按钮逻辑区 */}
                    <Button 
                      size="lg" 
                      className={`w-full text-lg font-bold h-14 transition-all
                        ${isInsufficientBalance ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 
                          step === 'approve' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gradient-to-r from-red-600 to-orange-600'
                        }`}
                      onClick={handleAction}
                      disabled={isPending || isConfirming || isInsufficientBalance || currentSupply >= MAX_SUPPLY}
                    >
                      {isPending ? (
                        <><Loader2 className="mr-2 animate-spin" /> 请在钱包签名...</>
                      ) : isConfirming ? (
                        <><Loader2 className="mr-2 animate-spin" /> 区块确认中...</>
                      ) : isInsufficientBalance ? (
                        "余额不足 (需要 20 KIKI)"
                      ) : step === 'approve' ? (
                        <><LockKeyhole className="mr-2 w-5 h-5" /> 第一步：授权支付 (Approve)</>
                      ) : (
                        <><Sparkles className="mr-2 fill-yellow-200 text-yellow-200" /> 第二步：立即铸造 (Mint)</>
                      )}
                    </Button>

                    {/* 提示信息 */}
                    <div className="text-center text-xs text-slate-500 mt-2">
                      {step === 'approve' && !isInsufficientBalance && "铸造前需要先授权合约扣除代币。"}
                      {step === 'mint' && "授权已完成，点击铸造即可。"}
                    </div>
                  </>
                )}

                {/* 成功反馈 */}
                {isConfirmed && step === 'mint' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 p-4 rounded-lg border border-green-500/20 text-center space-y-3"
                  >
                    <div className="flex items-center justify-center gap-2 text-green-400 font-bold">
                      <Check className="w-5 h-5" /> 
                      <span>铸造成功！20 KIKI 已支付</span>
                    </div>
                    {hash && (
                      <div className="py-2">
                        <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline">
                          查看交易详情 <ExternalLink className="w-3 h-3 inline" />
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