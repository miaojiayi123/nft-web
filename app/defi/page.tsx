'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowDown, Settings, Loader2, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import TokenBalance from '@/components/TokenBalance';

// --- 核心配置 ---
const KIKI_ADDRESS = '0x83F7A90486697B8B881319FbADaabF337fE2c60c';
const UNISWAP_ROUTER = '0xC532a74295D41230566067C4F02910d90C69a88b'; // Sepolia V2 Router
// ⚠️ 尝试使用 Sepolia 上最常用的 WETH 地址。如果 Price 依然是 ---，请替换为另一个: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
const WETH_ADDRESS = '0x7b79995e5f793a0cbe59318a3c79e3f16170a3f5'; 

// --- ABI 定义 ---
const tokenAbi = [
  { inputs: [{name: "spender", type: "address"}, {name: "amount", type: "uint256"}], name: "approve", outputs: [{type: "bool"}], stateMutability: "nonpayable", type: "function" },
  { inputs: [{name: "owner", type: "address"}, {name: "spender", type: "address"}], name: "allowance", outputs: [{type: "uint256"}], stateMutability: "view", type: "function" }
] as const;

const routerAbi = [
  { inputs: [{name: "amountOutMin", type: "uint256"}, {name: "path", type: "address[]"}, {name: "to", type: "address"}, {name: "deadline", type: "uint256"}], name: "swapExactETHForTokens", outputs: [{name: "amounts", type: "uint256[]"}], stateMutability: "payable", type: "function" },
  { inputs: [{name: "amountIn", type: "uint256"}, {name: "amountOutMin", type: "uint256"}, {name: "path", type: "address[]"}, {name: "to", type: "address"}, {name: "deadline", type: "uint256"}], name: "swapExactTokensForETH", outputs: [{name: "amounts", type: "uint256[]"}], stateMutability: "nonpayable", type: "function" },
  { inputs: [{name: "amountIn", type: "uint256"}, {name: "path", type: "address[]"}], name: "getAmountsOut", outputs: [{name: "amounts", type: "uint256[]"}], stateMutability: "view", type: "function" }
] as const;

export default function DeFiPage() {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy'); // 买还是卖
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('0');

  // 1. 获取用户对 KIKI 的授权额度
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: KIKI_ADDRESS, abi: tokenAbi, functionName: 'allowance',
    args: address ? [address, UNISWAP_ROUTER] : undefined
  });

  // 2. 实时询价 (Quote)
  const { data: amountsOut, error: quoteError } = useReadContract({
    address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'getAmountsOut',
    args: inputAmount && parseFloat(inputAmount) > 0 
      ? [parseEther(inputAmount), mode === 'buy' ? [WETH_ADDRESS, KIKI_ADDRESS] : [KIKI_ADDRESS, WETH_ADDRESS]] 
      : undefined,
  });

  // 3. 市场汇率查询 (1 ETH = ? KIKI)
  const { data: priceData, error: priceError } = useReadContract({
    address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'getAmountsOut',
    args: [parseEther('1'), [WETH_ADDRESS, KIKI_ADDRESS]], 
    query: { refetchInterval: 10000 } // 每10秒刷新
  });
  
  // 调试日志：如果 Price 出不来，F12 看这里
  useEffect(() => {
    if (priceError) console.error("Price Fetch Error:", priceError);
    if (quoteError) console.error("Quote Fetch Error:", quoteError);
  }, [priceError, quoteError]);

  // 更新输出框
  useEffect(() => {
    if (amountsOut && amountsOut[1]) {
      setOutputAmount(formatEther(amountsOut[1]));
    } else {
      setOutputAmount('0');
    }
  }, [amountsOut]);

  // 交易钩子
  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      refetchAllowance();
      setInputAmount('');
      alert("Transaction Successful!");
    }
    if (writeError) {
      console.error("Swap Write Error:", writeError);
      alert("Swap Failed: " + (writeError as any).shortMessage || writeError.message);
    }
  }, [isSuccess, writeError]);

  const handleApprove = () => {
    console.log("Approving...");
    writeContract({
      address: KIKI_ADDRESS, abi: tokenAbi, functionName: 'approve',
      args: [UNISWAP_ROUTER, parseEther('999999999')],
    });
  };

  const handleSwap = () => {
    console.log("Swap Clicked. Input:", inputAmount, "Mode:", mode);
    if (!inputAmount || !address) return;
    
    try {
      const amountIn = parseEther(inputAmount);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20分钟

      if (mode === 'buy') {
        console.log("Executing ETH -> KIKI");
        writeContract({
          address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'swapExactETHForTokens',
          args: [0n, [WETH_ADDRESS, KIKI_ADDRESS], address, deadline],
          value: amountIn,
        });
      } else {
        console.log("Executing KIKI -> ETH");
        writeContract({
          address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'swapExactTokensForETH',
          args: [amountIn, 0n, [KIKI_ADDRESS, WETH_ADDRESS], address, deadline],
        });
      }
    } catch (e) {
      console.error("Swap Logic Error:", e);
      alert("Error preparing swap.");
    }
  };

  const needsApproval = mode === 'sell' && allowance !== undefined && allowance < parseEther(inputAmount || '0');
  const currentPrice = priceData ? parseFloat(formatEther(priceData[1])).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '---';

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 font-sans flex flex-col items-center">
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      {/* Header */}
      <div className="relative z-10 w-full max-w-7xl px-6 py-6 flex justify-between items-center">
        <Link href="/dashboard" className="text-xs font-mono text-slate-500 hover:text-white flex items-center gap-2 uppercase">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="flex gap-4 items-center">
          <TokenBalance />
          <ConnectButton />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md mt-16 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2 flex items-center justify-center gap-2">
            <TrendingUp className="w-8 h-8 text-blue-500" /> DeFi Hub
          </h1>
          <p className="text-slate-400">Instant liquidity via Uniswap V2 Protocol.</p>
        </div>

        {/* Swap Card */}
        <div className="bg-[#12141a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-2 shadow-2xl">
          <div className="bg-[#0e1015] rounded-[20px] p-6 space-y-2">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-slate-400">Swap Assets</span>
              <Settings className="w-4 h-4 text-slate-600 hover:text-white cursor-pointer" />
            </div>

            {/* Input */}
            <div className="bg-[#1a1d26] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-slate-500 font-mono">You pay</span>
              </div>
              <div className="flex justify-between items-center">
                <input type="number" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} placeholder="0" className="bg-transparent text-3xl font-bold text-white placeholder:text-slate-600 outline-none w-full mr-4" />
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 shrink-0">
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${mode === 'buy' ? 'bg-slate-200 text-black' : 'bg-blue-600 text-white'}`}>{mode === 'buy' ? 'Ξ' : 'K'}</div>
                   <span className="font-bold">{mode === 'buy' ? 'ETH' : 'KIKI'}</span>
                </div>
              </div>
            </div>

            {/* Switch */}
            <div className="relative h-4 flex items-center justify-center">
              <button onClick={() => { setMode(mode === 'buy' ? 'sell' : 'buy'); setInputAmount(''); }} className="absolute bg-[#12141a] border border-white/10 p-2 rounded-xl text-slate-400 hover:text-white hover:scale-110 transition-all z-10">
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>

            {/* Output */}
            <div className="bg-[#1a1d26] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
               <div className="flex justify-between mb-2">
                <span className="text-xs text-slate-500 font-mono">You receive (Estimated)</span>
              </div>
              <div className="flex justify-between items-center">
                <input type="text" value={outputAmount ? parseFloat(outputAmount).toFixed(4) : '0'} disabled className="bg-transparent text-3xl font-bold text-slate-300 placeholder:text-slate-600 outline-none w-full mr-4 cursor-not-allowed" />
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 shrink-0">
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${mode === 'buy' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-black'}`}>{mode === 'buy' ? 'K' : 'Ξ'}</div>
                   <span className="font-bold">{mode === 'buy' ? 'KIKI' : 'ETH'}</span>
                </div>
              </div>
            </div>

            {/* Button */}
            <div className="pt-4">
              {!isConnected ? (
                <div className="w-full h-14 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-bold">Connect Wallet</div>
              ) : needsApproval ? (
                <Button onClick={handleApprove} disabled={isPending || isConfirming} className="w-full h-14 bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-lg rounded-xl">
                   {isPending ? <Loader2 className="animate-spin mr-2"/> : "Approve KIKI"}
                </Button>
              ) : (
                <Button onClick={handleSwap} disabled={!inputAmount || parseFloat(inputAmount) <= 0 || isPending || isConfirming} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                  {isPending || isConfirming ? <Loader2 className="animate-spin mr-2"/> : "Swap Now"}
                </Button>
              )}
            </div>
            
            {/* Error Message Display */}
             {(priceError || quoteError) && (
               <div className="mt-2 p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-2 text-xs text-red-400">
                 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                 <div>
                   <p className="font-bold">Data Fetch Error</p>
                   <p>Check console (F12) for details. Likely RPC limit or WETH mismatch.</p>
                 </div>
               </div>
             )}

          </div>
        </div>

        {/* Market Data */}
        <div className="mt-8 grid grid-cols-2 gap-4">
           <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
              <div className="text-xl font-bold text-white mb-1 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 text-slate-500" /> {currentPrice}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">KIKI per ETH</div>
           </div>
           <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
              <div className="text-xl font-bold text-white mb-1">Uniswap V2</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">Protocol</div>
           </div>
        </div>
      </div>
    </div>
  );
}