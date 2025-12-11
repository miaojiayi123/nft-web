'use client';

import { useState } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function TransferCard() {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  // 1. 发送交易的 Hook
  const { data: hash, sendTransaction, isPending } = useSendTransaction();

  // 2. 等待交易确认的 Hook
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !amount) return;
    
    // 调用钱包发起交易
    sendTransaction({ 
      to: to as `0x${string}`, 
      value: parseEther(amount) 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="h-full"
    >
      <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-sm relative overflow-hidden h-full flex flex-col">
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-400">
            <Send className="w-5 h-5" />
            快速转账
          </CardTitle>
          <CardDescription className="text-slate-400">
            发送 ETH 到任意钱包地址
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1">
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address" className="text-slate-300">接收地址</Label>
              <Input 
                id="address" 
                placeholder="0x..." 
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-black/20 border-slate-700 text-white placeholder:text-slate-600 focus:border-green-500/50 transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-slate-300">金额 (ETH)</Label>
              <Input 
                id="amount" 
                type="number" 
                step="0.0001"
                placeholder="0.01" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-black/20 border-slate-700 text-white placeholder:text-slate-600 focus:border-green-500/50 transition-colors"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isPending || isConfirming || !to || !amount}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold h-11 mt-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 请在钱包确认...
                </>
              ) : isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 交易确认中...
                </>
              ) : (
                '发送交易'
              )}
            </Button>

            {/* 成功提示 */}
            {isConfirmed && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-center text-sm text-green-400 mt-2 bg-green-500/10 p-2 rounded-lg border border-green-500/20"
              >
                🎉 交易已成功上链！
              </motion.div>
            )}
            
            {/* Hash 显示 */}
            {hash && (
              <div className="text-center pt-2">
                 <a 
                   href={`https://etherscan.io/tx/${hash}`} 
                   target="_blank" 
                   rel="noreferrer"
                   className="text-xs text-slate-500 hover:text-green-400 underline"
                 >
                   查看交易详情
                 </a>
              </div>
            )}

          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}