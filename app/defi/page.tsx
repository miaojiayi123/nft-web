'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowDown, Settings, Loader2, TrendingUp, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import TokenBalance from '@/components/TokenBalance';

// --- 核心配置 (全部全小写，防止 checksum 报错) ---
const KIKI_ADDRESS = '0x83f7a90486697b8b881319fbadaabf337fe2c60c';
const UNISWAP_ROUTER = '0xc532a74295d41230566067c4f02910d90c69a88b'; 
// ✅ 关键修复：使用与该 Router 绑定的正确 Sepolia WETH 地址
const WETH_ADDRESS = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14'; 

// --- ABI 定义 ---
const tokenAbi = [
  { inputs: [{name: "spender", type: "address"}, {name: "amount", type: "uint256"}], name: "approve", outputs: [{type: "bool"}], stateMutability: "nonpayable", type: "function" },
  { inputs: [{name: "owner", type: "address"}, {name: "spender", type: "address"}], name: "allowance", outputs: [{type: "uint256"}], stateMutability: "view", type: "function" }
] as const;

// 包含 Swap, Quote, 和 AddLiquidity 的完整 Router ABI
const routerAbi = [
  { inputs: [{name: "amountOutMin", type: "uint256"}, {name: "path", type: "address[]"}, {name: "to", type: "address"}, {name: "deadline", type: "uint256"}], name: "swapExactETHForTokens", outputs: [{name: "amounts", type: "uint256[]"}], stateMutability: "payable", type: "function" },
  { inputs: [{name: "amountIn", type: "uint256"}, {name: "amountOutMin", type: "uint256"}, {name: "path", type: "address[]"}, {name: "to", type: "address"}, {name: "deadline", type: "uint256"}], name: "swapExactTokensForETH", outputs: [{name: "amounts", type: "uint256[]"}], stateMutability: "nonpayable", type: "function" },
  { inputs: [{name: "amountIn", type: "uint256"}, {name: "path", type: "address[]"}], name: "getAmountsOut", outputs: [{name: "amounts", type: "uint256[]"}], stateMutability: "view", type: "function" },
  // 新增：添加流动性
  { inputs: [{name: "token", type: "address"}, {name: "amountTokenDesired", type: "uint256"}, {name: "amountTokenMin", type: "uint256"}, {name: "amountETHMin", type: "uint256"}, {name: "to", type: "address"}, {name: "deadline", type: "uint256"}], name: "addLiquidityETH", outputs: [], stateMutability: "payable", type: "function" }
] as const;

export default function DeFiPage() {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy'); 
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('0');

  // --- 1. 读取数据 ---
  // 检查 KIKI 授权
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: KIKI_ADDRESS, abi: tokenAbi, functionName: 'allowance',
    args: address ? [address, UNISWAP_ROUTER] : undefined
  });

  // 实时询价 (User Swap Quote)
  const { data: amountsOut } = useReadContract({
    address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'getAmountsOut',
    args: inputAmount && parseFloat(inputAmount) > 0 
      ? [parseEther(inputAmount), mode === 'buy' ? [WETH_ADDRESS, KIKI_ADDRESS] : [KIKI_ADDRESS, WETH_ADDRESS]] 
      : undefined,
  });

  // 全局价格查询 (1 ETH = ? KIKI)
  const { data: priceData, error: priceError, refetch: refetchPrice } = useReadContract({
    address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'getAmountsOut',
    args: [parseEther('1'), [WETH_ADDRESS, KIKI_ADDRESS]], 
    query: { refetchInterval: 5000 } 
  });
  
  // 更新输出框
  useEffect(() => {
    if (amountsOut && amountsOut[1]) {
      setOutputAmount(formatEther(amountsOut[1]));
    } else {
      setOutputAmount('0');
    }
  }, [amountsOut]);

  // --- 2. 交易处理 ---
  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      refetchAllowance();
      refetchPrice(); // 交易成功后刷新价格
      setInputAmount('');
      // 如果是在修复池子，给个大提示
      alert("✅ Transaction Confirmed on Blockchain!");
    }
    if (writeError) {
      console.error("Tx Error:", writeError);
      alert("Transaction Failed: " + (writeError as any).shortMessage || writeError.message);
    }
  }, [isSuccess, writeError]);

  // Approve
  const handleApprove = () => {
    writeContract({
      address: KIKI_ADDRESS, abi: tokenAbi, functionName: 'approve',
      args: [UNISWAP_ROUTER, parseEther('999999999')],
    });
  };

  // Swap
  const handleSwap = () => {
    if (!inputAmount || !address) return;
    const amountIn = parseEther(inputAmount);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

    if (mode === 'buy') {
      writeContract({
        address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'swapExactETHForTokens',
        args: [0n, [WETH_ADDRESS, KIKI_ADDRESS], address, deadline],
        value: amountIn,
      });
    } else {
      writeContract({
        address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'swapExactTokensForETH',
        args: [amountIn, 0n, [KIKI_ADDRESS, WETH_ADDRESS], address, deadline],
      });
    }
  };

  // 🛠️ 强制创建池子 (修复 getAmountsOut 报错)
  const handleInitializePool = () => {
    if (!confirm("Confirm to create Liquidity Pool with 0.01 ETH and 10,000 KIKI?")) return;
    writeContract({
      address: UNISWAP_ROUTER,
      abi: routerAbi,
      functionName: 'addLiquidityETH',
      args: [
        KIKI_ADDRESS,
        parseEther('10000'), // 初始注入 10,000 KIKI
        0n, 0n, // 滑点设为 0 以确保成功
        address!,
        BigInt(Math.floor(Date.now() / 1000) + 1200)
      ],
      value: parseEther('0.01'), // 初始注入 0.01 ETH
    });
  };

  const needsApproval = (mode === 'sell' || priceError) && allowance !== undefined && allowance < parseEther('10000');
  const currentPrice = priceData ? parseFloat(formatEther(priceData[1])).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '---';

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 font-sans flex flex-col items-center">
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      {/* Header */}
      <div className="relative z-10 w-full max-w-7xl px-6 py-6 flex justify-between items-center">
        <Link href="/dashboard" className="text-xs font-mono text-slate-500 hover:text-white flex items-center gap-2 uppercase">
          <ArrowLeft className="w-3 h-3" /> Dashboard
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

            {/* Action Button */}
            <div className="pt-4">
              {!isConnected ? (
                <div className="w-full h-14 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-bold">Connect Wallet</div>
              ) : needsApproval ? (
                <Button onClick={handleApprove} disabled={isPending || isConfirming} className="w-full h-14 bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-lg rounded-xl">
                   {isPending ? <Loader2 className="animate-spin mr-2"/> : "Approve KIKI"}
                </Button>
              ) : (
                <Button onClick={handleSwap} disabled={!inputAmount || parseFloat(inputAmount) <= 0 || isPending || isConfirming || !!priceError} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:bg-slate-800 disabled:shadow-none">
                  {isPending || isConfirming ? <Loader2 className="animate-spin mr-2"/> : "Swap Now"}
                </Button>
              )}
            </div>

          </div>
        </div>

        {/* 🚨 紧急修复区域：只有在找不到池子(Price Error)时才会显示 */}
        {priceError && (
          <div className="mt-6 p-5 border border-red-500/30 bg-red-900/10 rounded-2xl animate-in fade-in slide-in-from-bottom-4">
             <div className="flex items-start gap-3 mb-3">
               <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
               <div>
                 <h3 className="font-bold text-red-500">Liquidity Pool Not Found</h3>
                 <p className="text-xs text-red-300 mt-1 leading-relaxed">
                   The Router cannot find the KIKI/ETH pool on chain. This happens if the pool hasn't been initialized for this specific WETH address.
                 </p>
               </div>
             </div>
             <div className="flex gap-2">
                {allowance !== undefined && allowance < parseEther('10000') && (
                  <Button onClick={handleApprove} size="sm" variant="secondary" className="w-full h-9 text-xs" disabled={isPending}>
                     1. Approve KIKI
                  </Button>
                )}
                <Button onClick={handleInitializePool} size="sm" className="w-full h-9 text-xs bg-red-600 hover:bg-red-500 font-bold" disabled={isPending}>
                   {isPending ? <Loader2 className="w-3 h-3 animate-spin"/> : "2. Initialize Pool (Create)"}
                </Button>
             </div>
          </div>
        )}

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