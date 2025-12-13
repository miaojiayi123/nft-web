'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Gift, Timer, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { supabase } from '@/lib/supabaseClient';
import { logActivity } from '@/lib/logger'; // ✅ 1. 引入 logger

const TOKEN_CONTRACT_ADDRESS = '0x83F7A90486697B8B881319FbADaabF337fE2c60c';
const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000; 

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
  
  const [status, setStatus] = useState<'idle' | 'cooldown' | 'claiming' | 'success'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loadingCheck, setLoadingCheck] = useState(false);

  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // 1. 初始化检查
  useEffect(() => {
    const checkEligibility = async () => {
      if (!address) return;
      setLoadingCheck(true);

      const { data } = await supabase
        .from('faucet_claims')
        .select('last_claimed_at')
        .eq('wallet_address', address)
        .single();

      if (data) {
        const lastClaimed = new Date(data.last_claimed_at).getTime();
        const now = Date.now();
        const diff = now - lastClaimed;

        if (diff < COOLDOWN_PERIOD) {
          setStatus('cooldown');
          setTimeLeft(COOLDOWN_PERIOD - diff);
        } else {
          setStatus('idle');
        }
      } else {
        setStatus('idle');
      }
      setLoadingCheck(false);
    };

    if (isConnected) {
      checkEligibility();
    }
  }, [address, isConnected]);

  // 2. 倒计时
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'cooldown' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1000) {
            setStatus('idle');
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  // 3. ✅ 核心修改：监听成功 -> 写数据库 & 写日志
  useEffect(() => {
    const recordClaim = async () => {
      if (isConfirmed && address) {
        setStatus('success');
        
        // 3.1 写入冷却记录
        await supabase
          .from('faucet_claims')
          .upsert(
            { wallet_address: address, last_claimed_at: new Date().toISOString() }, 
            { onConflict: 'wallet_address' }
          );

        // 3.2 ✅ 写入 Activity Log
        await logActivity({
          address,
          type: 'CLAIM',
          details: '100 KIKI Faucet',
          hash // 传入交易哈希
        });

        setTimeout(() => {
           setStatus('cooldown');
           setTimeLeft(COOLDOWN_PERIOD);
        }, 3000);
      }
    };

    recordClaim();
  }, [isConfirmed, address, hash]); // 记得依赖项加上 hash

  const handleClaim = () => {
    if (!address) return;
    setStatus('claiming');
    const amount = BigInt(100) * BigInt(10) ** BigInt(18);
    writeContract({
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'mint',
      args: [address, amount],
    });
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  if (!isConnected) {
    return (
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-200"></div>
        <div className="relative bg-black rounded-lg p-1">
           <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button onClick={openConnectModal} className="w-full bg-[#0B0C10] hover:bg-[#15171f] text-white font-bold h-12 px-8 border border-white/10">
                  Connect to Claim
                </Button>
              )}
           </ConnectButton.Custom>
        </div>
      </div>
    );
  }

  if (loadingCheck) {
     return (
       <Button disabled className="w-full sm:w-auto h-14 bg-[#0B0C10] border border-white/10 text-slate-500 min-w-[200px]">
         <Loader2 className="w-4 h-4 animate-spin mr-2" /> Checking...
       </Button>
     );
  }

  if (status === 'cooldown') {
    return (
      <div className="relative group min-w-[200px]">
        <Button disabled size="lg" className="w-full sm:w-auto h-14 bg-[#12141a] border border-white/5 text-slate-400 font-mono text-sm rounded-xl">
          <Timer className="w-4 h-4 mr-2 text-slate-500" />
          {formatTime(timeLeft)}
        </Button>
        <p className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-slate-600 font-sans">Next claim available in</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 font-bold cursor-default h-14"
      >
        <Check className="w-5 h-5" /> <span>100 $KIKI Sent!</span>
        <motion.span 
          initial={{ y: 0, opacity: 1 }} animate={{ y: -20, opacity: 0 }} transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute -top-6 right-0 text-yellow-400 font-bold text-lg"
        >+100</motion.span>
      </motion.div>
    );
  }

  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
      <Button
        size="lg" onClick={handleClaim} disabled={isPending || isConfirming}
        className="relative w-full sm:w-auto min-w-[200px] h-14 bg-[#0B0C10] hover:bg-[#15171f] border border-white/10 text-white font-bold text-lg rounded-xl overflow-hidden transition-all"
      >
        <AnimatePresence mode="wait">
          {isPending || isConfirming ? (
            <motion.div key="loading" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-500">Minting...</span>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-yellow-500 group-hover:animate-bounce" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-orange-400 to-yellow-200">Claim 100 $KIKI</span>
              <div className="ml-2 px-2 py-0.5 bg-yellow-500/10 rounded text-[10px] text-yellow-500 border border-yellow-500/20">DAILY</div>
            </motion.div>
          )}
        </AnimatePresence>
        {!isPending && !isConfirming && <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />}
      </Button>
      {writeError && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="absolute -bottom-8 left-0 right-0 text-center text-xs text-red-400 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" /> <span>Transaction Failed</span>
        </motion.div>
      )}
    </div>
  );
}