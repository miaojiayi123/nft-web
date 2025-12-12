'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Send, Sparkles, UserPlus, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';

// ⚠️ 填入你的合约地址
const CONTRACT_ADDRESS = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 

const contractAbi = [
  {
    inputs: [{ name: "to", type: "address" }],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export default function AdminPage() {
  const { isConnected } = useAccount();
  const [targetAddress, setTargetAddress] = useState('');
  
  // 记录最近一次空投成功的地址
  const [lastAirdrop, setLastAirdrop] = useState<string | null>(null);

  const { data: hash, writeContract, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  const handleAirdrop = (e: React.FormEvent) => {
    e.preventDefault();
    // 简单的校验
    if (!targetAddress.startsWith('0x') || targetAddress.length !== 42) {
      alert("请输入正确的以太坊地址");
      return;
    }

    writeContract({
      // 👇 修复点 1：强制转换合约地址类型
      address: CONTRACT_ADDRESS as `0x${string}`, 
      abi: contractAbi,
      functionName: 'mint',
      // 👇 修复点 2：强制转换目标地址类型
      args: [targetAddress as `0x${string}`], 
    });
  };

  // 交易成功后清空输入框
  if (isConfirmed && targetAddress && lastAirdrop !== targetAddress) {
    setLastAirdrop(targetAddress);
    setTargetAddress('');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 relative overflow-hidden flex flex-col items-center">
      
      {/* 背景装饰 */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

      {/* 顶部导航 */}
      <nav className="w-full max-w-4xl flex justify-between items-center mb-12 z-10">
        <Link href="/dashboard" className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回控制台
        </Link>
        <ConnectButton />
      </nav>

      <div className="w-full max-w-2xl z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <Sparkles className="text-yellow-400 fill-yellow-400" />
            魔法空投控制台
          </h1>
          <p className="text-slate-400">
            作为公会会长，你可以直接向新成员发放 Kiki NFT。
          </p>
        </div>

        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl">
          <CardHeader className="border-b border-white/5 pb-6">
            <CardTitle className="text-xl text-blue-400 flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> 定向发放 (Airdrop)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            
            <form onSubmit={handleAirdrop} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-slate-300">接收者钱包地址 (0x...)</Label>
                <div className="relative">
                  <Input 
                    id="address" 
                    placeholder="例如: 0x123...abc" 
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    className="bg-black/40 border-slate-700 text-white h-12 font-mono pl-4 pr-12 focus:border-blue-500/50"
                    disabled={isPending || isConfirming}
                  />
                  <div className="absolute right-4 top-3 text-slate-500">
                    <Send className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  * 对方无需支付 Gas 费，费用由你（会长）承担。
                </p>
              </div>

              {!isConnected ? (
                <div className="bg-slate-800/50 p-4 rounded-lg text-center text-slate-400 text-sm">
                  请先连接管理员钱包
                </div>
              ) : (
                <Button 
                  type="submit" 
                  disabled={!targetAddress || isPending || isConfirming}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold text-lg"
                >
                  {isPending ? (
                    <><Loader2 className="mr-2 animate-spin" /> 请求签名...</>
                  ) : isConfirming ? (
                    <><Loader2 className="mr-2 animate-spin" /> 正在空投...</>
                  ) : (
                    <>🚀 发送空投</>
                  )}
                </Button>
              )}
            </form>

            <AnimatePresence>
              {isConfirmed && lastAirdrop && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6"
                >
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-4">
                    <div className="bg-green-500/20 p-2 rounded-full">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-green-400">空投发送成功！</h4>
                      <p className="text-sm text-slate-400 mt-1 break-all">
                        已向 <span className="text-slate-200 font-mono">{lastAirdrop}</span> 发送了 1 枚 Kiki NFT。
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}