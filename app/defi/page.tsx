'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowDown, Database, Loader2, RefreshCw, Plus, ArrowRightLeft, Droplets, Wallet, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import TokenBalance from '@/components/TokenBalance';
// ✅ 修复点 1：引入 Variants 类型
import { motion, AnimatePresence, Variants } from 'framer-motion';

// --- 核心配置 ---
const KIKI_ADDRESS = '0x83f7a90486697b8b881319fbadaabf337fe2c60c' as const;
const UNISWAP_ROUTER = '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3'.toLowerCase() as `0x${string}`;
const WETH_ADDRESS = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14'.toLowerCase() as `0x${string}`;

// --- ABI 定义 ---
const tokenAbi = [
  { inputs: [{name: "spender", type: "address"}, {name: "amount", type: "uint256"}], name: "approve", outputs: [{type: "bool"}], stateMutability: "nonpayable", type: "function" },
  { inputs: [{name: "owner", type: "address"}, {name: "spender", type: "address"}], name: "allowance", outputs: [{type: "uint256"}], stateMutability: "view", type: "function" }
] as const;

const routerAbi = [
  { inputs: [{name: "amountOutMin", type: "uint256"}, {name: "path", type: "address[]"}, {name: "to", type: "address"}, {name: "deadline", type: "uint256"}], name: "swapExactETHForTokens", outputs: [{name: "amounts", type: "uint256[]"}], stateMutability: "payable", type: "function" },
  { inputs: [{name: "amountIn", type: "uint256"}, {name: "amountOutMin", type: "uint256"}, {name: "path", type: "address[]"}, {name: "to", type: "address"}, {name: "deadline", type: "uint256"}], name: "swapExactTokensForETH", outputs: [{name: "amounts", type: "uint256[]"}], stateMutability: "nonpayable", type: "function" },
  { inputs: [{name: "amountIn", type: "uint256"}, {name: "path", type: "address[]"}], name: "getAmountsOut", outputs: [{name: "amounts", type: "uint256[]"}], stateMutability: "view", type: "function" },
  { inputs: [{name: "token", type: "address"}, {name: "amountTokenDesired", type: "uint256"}, {name: "amountTokenMin", type: "uint256"}, {name: "amountETHMin", type: "uint256"}, {name: "to", type: "address"}, {name: "deadline", type: "uint256"}], name: "addLiquidityETH", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [], name: "factory", outputs: [{internalType: "address", name: "", type: "address"}], stateMutability: "view", type: "function" }
] as const;

const factoryAbi = [
  { inputs: [{internalType: "address", name: "tokenA", type: "address"}, {internalType: "address", name: "tokenB", type: "address"}], name: "getPair", outputs: [{internalType: "address", name: "pair", type: "address"}], stateMutability: "view", type: "function" }
] as const;

const pairAbi = [
  { inputs: [], name: "getReserves", outputs: [{internalType: "uint112", name: "_reserve0", type: "uint112"}, {internalType: "uint112", name: "_reserve1", type: "uint112"}, {internalType: "uint32", name: "_blockTimestampLast", type: "uint32"}], stateMutability: "view", type: "function" },
  { inputs: [], name: "token0", outputs: [{internalType: "address", name: "", type: "address"}], stateMutability: "view", type: "function" }
] as const;

// --- 动画配置 ---
// ✅ 修复点 2：添加类型注解 : Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

// ✅ 修复点 3：添加类型注解 : Variants
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

export default function DeFiPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'swap' | 'pool'>('swap');
  const [mode, setMode] = useState<'buy' | 'sell'>('buy'); 
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('0'); 
  const [requiredKiki, setRequiredKiki] = useState('0');

  // --- Logic Hooks (Same as before) ---
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: KIKI_ADDRESS, abi: tokenAbi, functionName: 'allowance',
    args: address ? [address, UNISWAP_ROUTER] : undefined
  });

  const { data: priceData, refetch: refetchPrice } = useReadContract({
    address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'getAmountsOut',
    args: [parseEther('1'), [WETH_ADDRESS, KIKI_ADDRESS]], 
    query: { refetchInterval: 5000 } 
  });
  const currentRate = priceData ? parseFloat(formatEther(priceData[1])) : 0;

  const { data: factoryAddress } = useReadContract({
    address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'factory',
  });
  
  const { data: pairAddress } = useReadContract({
    address: factoryAddress, abi: factoryAbi, functionName: 'getPair',
    args: factoryAddress ? [KIKI_ADDRESS, WETH_ADDRESS] : undefined,
  });

  const { data: reserves, refetch: refetchReserves } = useReadContract({
    address: pairAddress, abi: pairAbi, functionName: 'getReserves',
    query: { refetchInterval: 5000 }
  });

  const { data: token0 } = useReadContract({
    address: pairAddress, abi: pairAbi, functionName: 'token0',
  });

  let ethReserve = '0';
  let kikiReserve = '0';
  if (reserves && token0) {
    if (token0.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
      ethReserve = formatEther(reserves[0]);
      kikiReserve = formatEther(reserves[1]);
    } else {
      kikiReserve = formatEther(reserves[0]);
      ethReserve = formatEther(reserves[1]);
    }
  }

  const swapPath = (mode === 'buy' ? [WETH_ADDRESS, KIKI_ADDRESS] : [KIKI_ADDRESS, WETH_ADDRESS]) as `0x${string}`[];
  const shouldFetchSwap = activeTab === 'swap' && inputAmount && !isNaN(parseFloat(inputAmount)) && parseFloat(inputAmount) > 0;
  
  const swapQueryArgs = shouldFetchSwap 
    ? [parseEther(inputAmount), swapPath] as const
    : undefined;

  const { data: amountsOut } = useReadContract({
    address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'getAmountsOut',
    args: swapQueryArgs as any,
  });

  useEffect(() => {
    if (activeTab === 'swap') {
      if (amountsOut && amountsOut[1]) setOutputAmount(formatEther(amountsOut[1]));
      else setOutputAmount('0');
    } else if (activeTab === 'pool' && inputAmount && currentRate > 0) {
      const val = parseFloat(inputAmount);
      if (!isNaN(val)) {
        const estimatedKiki = val * currentRate;
        setRequiredKiki(estimatedKiki.toFixed(2));
      }
    }
  }, [amountsOut, inputAmount, activeTab, currentRate]);

  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      refetchAllowance(); refetchPrice(); refetchReserves();
      setInputAmount('');
    }
  }, [isSuccess]);

  const handleSwap = () => {
    if (!inputAmount || !address) return;
    const amountIn = parseEther(inputAmount);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    const path = (mode === 'buy' ? [WETH_ADDRESS, KIKI_ADDRESS] : [KIKI_ADDRESS, WETH_ADDRESS]) as `0x${string}`[];

    if (mode === 'buy') {
      writeContract({
        address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'swapExactETHForTokens',
        args: [0n, path, address, deadline], value: amountIn,
      });
    } else {
      writeContract({
        address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'swapExactTokensForETH',
        args: [amountIn, 0n, path, address, deadline],
      });
    }
  };

  const handleApprove = () => {
    writeContract({ address: KIKI_ADDRESS, abi: tokenAbi, functionName: 'approve', args: [UNISWAP_ROUTER, parseEther('999999999')] });
  };

  const handleAddLiquidity = () => {
    if (!inputAmount || !requiredKiki || !address) return;
    writeContract({
      address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'addLiquidityETH',
      args: [KIKI_ADDRESS, parseEther(requiredKiki), 0n, 0n, address, BigInt(Math.floor(Date.now() / 1000) + 1200)],
      value: parseEther(inputAmount),
    });
  };

  const needsApproval = allowance !== undefined && allowance < parseEther('1000000');
  const displayPrice = currentRate > 0 ? currentRate.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '---';

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-200 font-sans flex flex-col items-center selection:bg-blue-500/30">
      {/* 🌌 Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 to-transparent opacity-50 blur-3xl" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
      
      {/* 🟢 Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        className="relative z-10 w-full max-w-7xl px-6 py-6 flex justify-between items-center"
      >
        <Link href="/dashboard" className="group flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-white transition-colors uppercase tracking-wider">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Dashboard
        </Link>
        <div className="flex gap-4 items-center">
          <div className="hidden md:block"><TokenBalance /></div>
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </motion.div>

      {/* 🚀 Main Content Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-5xl mt-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        
        {/* 📊 Left Column: Stats Panel */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
           <motion.div variants={itemVariants} className="text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 mb-4 uppercase tracking-widest">
                Uniswap V2 Protocol
              </div>
              <h1 className="text-5xl font-bold text-white tracking-tight mb-3">
                DeFi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Hub</span>
              </h1>
              <p className="text-slate-400 leading-relaxed text-sm">
                Swap tokens instantly or provide liquidity to earn trading fees. Powered by automated market makers.
              </p>
           </motion.div>

           <motion.div variants={itemVariants} className="group relative bg-[#0e1015]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden hover:border-white/20 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative flex justify-between items-start mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-500" /> Pool Stats
                </h3>
                <a href={`https://sepolia.etherscan.io/address/${pairAddress}`} target="_blank" className="p-2 rounded-full hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4 -rotate-45" />
                </a>
              </div>
              
              <div className="space-y-3">
                 {/* ETH Reserve */}
                 <div className="flex justify-between items-center p-4 bg-[#0a0b0e] border border-white/5 rounded-2xl group/item hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg shadow-lg">Ξ</div>
                       <div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pooled ETH</div>
                          <div className="text-white font-mono text-lg font-semibold">{parseFloat(ethReserve).toFixed(4)}</div>
                       </div>
                    </div>
                 </div>

                 {/* KIKI Reserve */}
                 <div className="flex justify-between items-center p-4 bg-[#0a0b0e] border border-white/5 rounded-2xl group/item hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-lg font-bold text-white shadow-lg">K</div>
                       <div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pooled KIKI</div>
                          <div className="text-white font-mono text-lg font-semibold">{parseFloat(kikiReserve).toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                       </div>
                    </div>
                 </div>
              </div>
           </motion.div>

           <motion.div variants={itemVariants} className="p-4 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-2xl border border-blue-500/20 flex items-center justify-center gap-3">
              <RefreshCw className="w-4 h-4 text-blue-400 animate-[spin_10s_linear_infinite]" />
              <div className="text-xs font-mono text-blue-200">
                1 ETH ≈ <span className="font-bold text-white text-base mx-1">{displayPrice}</span> KIKI
              </div>
           </motion.div>
        </div>

        {/* 🎛️ Right Column: Interaction Card */}
        <motion.div variants={itemVariants} className="lg:col-span-7">
          <div className="bg-[#12141a]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-2 shadow-2xl ring-1 ring-white/5">
            <div className="bg-[#0e1015] rounded-[24px] p-6 sm:p-8 space-y-6">
              
              {/* Tab Switcher */}
              <div className="flex p-1 bg-[#1a1d26] rounded-2xl border border-white/5 relative">
                 {(['swap', 'pool'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setInputAmount(''); }}
                      className={`relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold z-10 transition-colors ${activeTab === tab ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {activeTab === tab && (
                        <motion.div 
                          layoutId="activeTab" 
                          className={`absolute inset-0 rounded-xl shadow-lg ${tab === 'swap' ? 'bg-blue-600' : 'bg-indigo-600'}`} 
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                         {tab === 'swap' ? <ArrowRightLeft className="w-4 h-4" /> : <Droplets className="w-4 h-4" />}
                         {tab === 'swap' ? 'Swap' : 'Add Liquidity'}
                      </span>
                    </button>
                 ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between px-1">
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{activeTab === 'swap' ? 'You Pay' : 'Deposit Amount'}</span>
                   <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Wallet className="w-3 h-3" />
                      <span>Balance: ---</span>
                   </div>
                </div>
                
                {/* Input Area 1 */}
                <div className="group bg-[#1a1d26] p-5 rounded-2xl border border-white/5 hover:border-white/10 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200">
                  <div className="flex justify-between items-center gap-4">
                    <input 
                      type="number" 
                      value={inputAmount} 
                      onChange={(e) => setInputAmount(e.target.value)} 
                      placeholder="0.0" 
                      className="bg-transparent text-4xl font-bold text-white placeholder:text-slate-700 outline-none w-full font-mono" 
                    />
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 shrink-0">
                       {activeTab === 'swap' && mode === 'sell' ? (
                          <>
                             <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">K</div>
                             <span className="font-bold pr-1">KIKI</span>
                          </>
                       ) : (
                          <>
                             <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-black">Ξ</div>
                             <span className="font-bold pr-1">ETH</span>
                          </>
                       )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Action / Divider */}
              <div className="relative h-6 flex items-center justify-center">
                <div className="absolute w-full h-[1px] bg-white/5" />
                {activeTab === 'swap' ? (
                   <motion.button 
                     whileHover={{ scale: 1.1, rotate: 180 }}
                     whileTap={{ scale: 0.9 }}
                     onClick={() => setMode(mode === 'buy' ? 'sell' : 'buy')} 
                     className="relative bg-[#12141a] border border-white/10 p-2.5 rounded-xl text-slate-400 hover:text-white hover:border-blue-500/50 transition-colors z-10 shadow-xl"
                   >
                     <ArrowDown className="w-4 h-4" />
                   </motion.button>
                ) : (
                   <div className="relative bg-[#12141a] border border-white/10 p-2 rounded-full text-slate-500 z-10">
                     <Plus className="w-4 h-4" />
                   </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">{activeTab === 'swap' ? 'You Receive' : 'Required Asset'}</span>
                
                {/* Input Area 2 (Output) */}
                <div className="bg-[#1a1d26] p-5 rounded-2xl border border-white/5">
                   <div className="flex justify-between items-center gap-4">
                     {activeTab === 'swap' ? (
                        <input type="text" value={outputAmount ? parseFloat(outputAmount).toFixed(4) : '0'} disabled className="bg-transparent text-4xl font-bold text-slate-300 placeholder:text-slate-700 outline-none w-full font-mono cursor-not-allowed opacity-80" />
                     ) : (
                        <input type="text" value={requiredKiki} disabled className="bg-transparent text-4xl font-bold text-slate-300 placeholder:text-slate-700 outline-none w-full font-mono cursor-not-allowed opacity-80" />
                     )}
                     
                     <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 shrink-0">
                        {activeTab === 'swap' && mode === 'buy' || activeTab === 'pool' ? (
                           <>
                              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">K</div>
                              <span className="font-bold pr-1">KIKI</span>
                           </>
                        ) : (
                           <>
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-black">Ξ</div>
                              <span className="font-bold pr-1">ETH</span>
                           </>
                        )}
                     </div>
                   </div>
                </div>
              </div>

              {/* Main Action Button */}
              <div className="pt-2">
                {!isConnected ? (
                  <div className="w-full h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-400 font-bold border border-white/5">Connect Wallet to Trade</div>
                ) : needsApproval ? (
                  <Button onClick={handleApprove} disabled={isPending || isConfirming} className="w-full h-16 bg-yellow-600/90 hover:bg-yellow-500 text-white font-bold text-xl rounded-2xl transition-all shadow-lg shadow-yellow-900/20">
                     {isPending ? <Loader2 className="animate-spin mr-2"/> : "Approve KIKI Usage"}
                  </Button>
                ) : (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      onClick={activeTab === 'swap' ? handleSwap : handleAddLiquidity} 
                      disabled={!inputAmount || parseFloat(inputAmount) <= 0 || isPending || isConfirming} 
                      className={`w-full h-16 font-bold text-xl rounded-2xl shadow-xl transition-all ${
                        activeTab === 'swap' 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30' 
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-900/30'
                      }`}
                    >
                      {isPending || isConfirming ? <Loader2 className="animate-spin mr-2"/> : (activeTab === 'swap' ? 'Swap Now' : 'Add Liquidity')}
                    </Button>
                  </motion.div>
                )}
              </div>
              
              {/* Additional Details */}
              {activeTab === 'swap' && outputAmount !== '0' && (
                <div className="flex justify-between text-xs text-slate-500 px-2 pt-2">
                  <span>Price Impact</span>
                  <span className="text-green-400">{'<'} 0.01%</span>
                </div>
              )}

            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}