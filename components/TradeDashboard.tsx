'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Loader2, Wifi, Trash2, Zap, X, Check, ExternalLink } from 'lucide-react';
import { createChart, ColorType, ISeriesApi, Time, CandlestickData, CandlestickSeries, CrosshairMode } from 'lightweight-charts';
import { motion, AnimatePresence } from 'framer-motion';

// --- 🔧 配置 ---
const KIKI_ADDRESS = '0x83f7a90486697b8b881319fbadaabf337fe2c60c' as const;
const UNISWAP_ROUTER = '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3'.toLowerCase() as `0x${string}`;
const WETH_ADDRESS = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14'.toLowerCase() as `0x${string}`;

// --- ABI ---
const routerAbi = [
  { inputs: [{name: "amountOutMin", type: "uint256"}, {name: "path", type: "address[]"}, {name: "to", type: "address"}, {name: "deadline", type: "uint256"}], name: "swapExactETHForTokens", outputs: [{name: "amounts", type: "uint256[]"}], stateMutability: "payable", type: "function" },
  { inputs: [{name: "amountIn", type: "uint256"}, {name: "amountOutMin", type: "uint256"}, {name: "path", type: "address[]"}, {name: "to", type: "address"}, {name: "deadline", type: "uint256"}], name: "swapExactTokensForETH", outputs: [{name: "amounts", type: "uint256[]"}], stateMutability: "nonpayable", type: "function" },
  { inputs: [{name: "amountIn", type: "uint256"}, {name: "path", type: "address[]"}], name: "getAmountsOut", outputs: [{name: "amounts", type: "uint256[]"}], stateMutability: "view", type: "function" },
] as const;

const tokenAbi = [
  { inputs: [{name: "spender", type: "address"}, {name: "amount", type: "uint256"}], name: "approve", outputs: [{type: "bool"}], stateMutability: "nonpayable", type: "function" },
  { inputs: [{name: "owner", type: "address"}, {name: "spender", type: "address"}], name: "allowance", outputs: [{type: "uint256"}], stateMutability: "view", type: "function" }
] as const;

export default function TradeDashboard() {
  const { address, isConnected } = useAccount();
  
  // 交易状态
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
  const [inputValue, setInputValue] = useState('');
  const [buyUnit, setBuyUnit] = useState<'ETH' | 'USDT'>('ETH');
  const [sellUnit, setSellUnit] = useState<'KIKI' | 'USDT'>('KIKI');
  
  // 弹窗状态
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // --- 1. 获取数据源 ---
  const [binanceEthPrice, setBinanceEthPrice] = useState<number>(0);
  
  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/ethusdt@trade');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.p) setBinanceEthPrice(parseFloat(data.p));
    };
    return () => ws.close();
  }, []);

  const { data: swapAmounts, refetch: refetchSwapRate } = useReadContract({
    address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'getAmountsOut',
    args: [parseEther('1'), [WETH_ADDRESS, KIKI_ADDRESS]], 
    query: { refetchInterval: 5000 } 
  });
  const kikiPerEth = swapAmounts ? parseFloat(formatEther(swapAmounts[1])) : 0;
  const realKikiUsdPrice = (binanceEthPrice > 0 && kikiPerEth > 0) ? (binanceEthPrice / kikiPerEth) : 0;

  // --- 2. K线图逻辑 ---
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const chartDataRef = useRef<CandlestickData<Time>[]>([]);

  const saveToStorage = (data: CandlestickData<Time>[]) => {
    if (typeof window !== 'undefined') {
      const dataToSave = data.length > 500 ? data.slice(-500) : data;
      localStorage.setItem('kiki_chart_v3', JSON.stringify(dataToSave));
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('kiki_chart_v3');
    window.location.reload();
  };

  // 辅助函数：北京时间格式化
  const formatBeijingTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const chart = createChart(chartContainerRef.current, {
      layout: { 
        background: { type: ColorType.Solid, color: '#0B0C10' }, // 纯黑背景
        textColor: '#9CA3AF' 
      },
      grid: { 
        vertLines: { color: '#1e293b' }, 
        horzLines: { color: '#1e293b' } 
      },
      width: chartContainerRef.current.clientWidth, 
      height: 400,
      
      // ✅ 1. 本地化设置：强制北京时间 (十字准星显示的时间)
      localization: { 
        locale: 'zh-CN', 
        dateFormat: 'yyyy/MM/dd',
        timeFormatter: (time: number) => formatBeijingTime(time) 
      },
      
      // ✅ 2. 时间轴设置：强制北京时间 (底部X轴刻度)
      timeScale: { 
        borderColor: '#334155', 
        timeVisible: true, 
        secondsVisible: false, 
        rightOffset: 12,
        tickMarkFormatter: (time: number) => formatBeijingTime(time),
      },

      rightPriceScale: { visible: true, borderColor: '#334155', textColor: '#D1D5DB', scaleMargins: { top: 0.2, bottom: 0.2 } },
      crosshair: { mode: CrosshairMode.Normal },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444', borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444',
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
    });
    seriesRef.current = candlestickSeries;

    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || realKikiUsdPrice === 0) return;

    if (chartDataRef.current.length === 0) {
      const savedData = localStorage.getItem('kiki_chart_v3');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        seriesRef.current.setData(parsedData);
        chartDataRef.current = parsedData;
      } else {
        const initialData: CandlestickData<Time>[] = [];
        let time = Math.floor(Date.now() / 1000) - 60 * 60; 
        for (let i = 0; i < 60; i++) {
          const base = realKikiUsdPrice;
          const volatility = base * 0.002; 
          const open = base + (Math.random() - 0.5) * volatility;
          const close = base + (Math.random() - 0.5) * volatility;
          const high = Math.max(open, close) + Math.random() * volatility * 0.5;
          const low = Math.min(open, close) - Math.random() * volatility * 0.5;
          initialData.push({ time: time as Time, open, high, low, close });
          time += 60;
        }
        initialData[initialData.length - 1].close = realKikiUsdPrice;
        seriesRef.current.setData(initialData);
        chartDataRef.current = initialData;
      }
    }

    const intervalId = setInterval(() => {
        const nowTimestamp = Math.floor(Date.now() / 1000);
        const currentCandleTime = (Math.floor(nowTimestamp / 60) * 60) as Time;
        if (chartDataRef.current.length === 0) return;
        const lastCandle = chartDataRef.current[chartDataRef.current.length - 1];
        let newDataToSave = [...chartDataRef.current];

        if (currentCandleTime > lastCandle.time) {
            const newCandle = { time: currentCandleTime, open: lastCandle.close, high: realKikiUsdPrice, low: realKikiUsdPrice, close: realKikiUsdPrice };
            seriesRef.current?.update(newCandle);
            newDataToSave.push(newCandle);
        } else {
            const updatedCandle = { ...lastCandle, high: Math.max(lastCandle.high, realKikiUsdPrice), low: Math.min(lastCandle.low, realKikiUsdPrice), close: realKikiUsdPrice };
            seriesRef.current?.update(updatedCandle);
            newDataToSave[newDataToSave.length - 1] = updatedCandle;
        }
        chartDataRef.current = newDataToSave;
        saveToStorage(newDataToSave);
    }, 1000); 

    return () => clearInterval(intervalId);
  }, [realKikiUsdPrice]);

  // --- 3. 🧮 交易计算 ---
  const currentUnit = tradeSide === 'buy' ? buyUnit : sellUnit;

  const txValues = useMemo(() => {
    if (!inputValue || !realKikiUsdPrice || !binanceEthPrice || !kikiPerEth) 
        return { ethToSend: 0n, kikiToSell: 0n };

    const val = parseFloat(inputValue);
    
    if (tradeSide === 'buy') {
        if (buyUnit === 'ETH') {
            return { ethToSend: parseEther(val.toFixed(18)), kikiToSell: 0n };
        } else {
            return { ethToSend: parseEther((val / binanceEthPrice).toFixed(18)), kikiToSell: 0n };
        }
    } else {
        if (sellUnit === 'KIKI') {
            return { ethToSend: 0n, kikiToSell: parseEther(val.toFixed(18)) };
        } else {
            const kikiAmt = val / realKikiUsdPrice;
            return { ethToSend: 0n, kikiToSell: parseEther(kikiAmt.toFixed(18)) };
        }
    }
  }, [inputValue, tradeSide, buyUnit, sellUnit, realKikiUsdPrice, binanceEthPrice, kikiPerEth]);

  const equalsToDisplay = useMemo(() => {
    if (!inputValue || !realKikiUsdPrice || !binanceEthPrice || !kikiPerEth) return '0.00';
    const val = parseFloat(inputValue);

    if (tradeSide === 'buy') {
        if (buyUnit === 'ETH') {
            return (val * kikiPerEth).toLocaleString(undefined, {maximumFractionDigits: 2}) + ' KIKI';
        } else {
            const ethAmt = val / binanceEthPrice;
            return (ethAmt * kikiPerEth).toLocaleString(undefined, {maximumFractionDigits: 2}) + ' KIKI';
        }
    } else {
        if (sellUnit === 'KIKI') {
            return (val / kikiPerEth).toFixed(6) + ' ETH';
        } else {
            return (val / binanceEthPrice).toFixed(6) + ' ETH';
        }
    }
  }, [inputValue, tradeSide, buyUnit, sellUnit, realKikiUsdPrice, binanceEthPrice, kikiPerEth]);

  const { data: allowance } = useReadContract({ address: KIKI_ADDRESS, abi: tokenAbi, functionName: 'allowance', args: address ? [address, UNISWAP_ROUTER] : undefined });
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => { 
    if (isSuccess) { 
        refetchSwapRate(); 
        setInputValue(''); 
        setShowSuccessModal(true);
    } 
  }, [isSuccess]);

  const handleTrade = () => {
    if (!inputValue || !address) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    
    if (tradeSide === 'buy') {
      writeContract({ 
        address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'swapExactETHForTokens', 
        args: [0n, [WETH_ADDRESS, KIKI_ADDRESS], address, deadline], 
        value: txValues.ethToSend 
      });
    } else {
      writeContract({ 
        address: UNISWAP_ROUTER, abi: routerAbi, functionName: 'swapExactTokensForETH', 
        args: [txValues.kikiToSell, 0n, [KIKI_ADDRESS, WETH_ADDRESS], address, deadline] 
      });
    }
  };
  
  const handleApprove = () => writeContract({ address: KIKI_ADDRESS, abi: tokenAbi, functionName: 'approve', args: [UNISWAP_ROUTER, parseEther('999999999')] });
  
  const toggleUnit = () => {
    if (tradeSide === 'buy') {
        setBuyUnit(prev => prev === 'ETH' ? 'USDT' : 'ETH');
    } else {
        setSellUnit(prev => prev === 'KIKI' ? 'USDT' : 'KIKI');
    }
    setInputValue(''); 
  };

  const switchSide = (side: 'buy' | 'sell') => {
      setTradeSide(side);
      setInputValue('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px] relative">
      
      {/* 🔴 全局弹窗层 */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="bg-[#161A1E] border border-white/10 p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full mx-4 relative"
            >
              <button onClick={() => setShowSuccessModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                <Check className="w-10 h-10 text-green-500 animate-pulse" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Order Filled!</h3>
              <p className="text-slate-400 text-sm mb-6">Your transaction has been successfully processed on the Sepolia network.</p>
              {hash && (
                <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 text-sm mb-6 font-mono bg-blue-500/5 py-2 rounded-lg border border-blue-500/10 hover:border-blue-500/30 transition-all">
                  View on Etherscan <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <Button onClick={() => setShowSuccessModal(false)} className="w-full bg-white text-black hover:bg-slate-200 font-bold h-12 rounded-xl">Done</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📉 左侧：K线图 */}
      <div className="lg:col-span-8 p-6 flex flex-col border-r border-white/10 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex items-baseline gap-3">
            <h3 className="text-2xl font-bold text-white tracking-tight">KIKI/USDT</h3>
            <span className={`text-2xl font-mono font-bold ${realKikiUsdPrice > 0 ? 'text-green-400' : 'text-slate-600'}`}>
              ${realKikiUsdPrice > 0 ? realKikiUsdPrice.toFixed(5) : 'Loading...'}
            </span>
            <div onClick={clearHistory} className="cursor-pointer hover:bg-white/10 p-1 rounded transition-colors group" title="Reset Chart">
               <Trash2 className="w-4 h-4 text-slate-700 group-hover:text-red-500" />
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/10 px-2 py-1 rounded border border-yellow-500/20">
                <Zap className="w-3 h-3 animate-pulse fill-yellow-400"/> 
                <span>Binance Live: ${binanceEthPrice.toLocaleString()}</span>
             </div>
          </div>
        </div>
        
        {/* ✅ 背景修复：使用 #0B0C10 */}
        <div className="flex-1 relative w-full min-h-[350px] bg-[#0B0C10] rounded-lg border border-white/5 overflow-hidden" ref={chartContainerRef}>
           {realKikiUsdPrice === 0 && (
             <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm gap-2">
               <Loader2 className="animate-spin text-blue-500"/> Connecting to Binance...
             </div>
           )}
        </div>
      </div>

      {/* 🛒 右侧：交易面板 */}
      <div className="lg:col-span-4 p-8 bg-[#0B0C10]/30 flex flex-col justify-center">
        <div className="bg-[#1a1d26] p-1 rounded-xl flex mb-8 border border-white/5">
           <button onClick={() => switchSide('buy')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-300 ${tradeSide === 'buy' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Buy</button>
           <button onClick={() => switchSide('sell')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-300 ${tradeSide === 'sell' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Sell</button>
        </div>

        <div className="space-y-6">
           <div>
             <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 items-center">
               <span>{tradeSide === 'buy' ? 'PAY WITH' : 'SELL AMOUNT'}</span>
               <div onClick={toggleUnit} className="cursor-pointer text-blue-400 hover:text-blue-300 transition-colors text-[10px] bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                 By {currentUnit}
               </div>
             </div>
             
             <div className="relative">
                <input 
                  type="number" 
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  className="w-full bg-[#1a1d26] border border-white/5 focus:border-blue-500 rounded-xl px-4 py-5 font-mono font-bold text-white outline-none text-2xl placeholder:text-slate-700 transition-all pr-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  placeholder="0.00"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-300 pointer-events-none">
                  {currentUnit}
                </div>
             </div>

             <div className="mt-3 flex justify-between items-center px-2">
                <span className="text-xs text-slate-500">equals to</span>
                <span className="text-sm font-mono text-white flex items-center gap-1 font-bold">
                  {inputValue ? equalsToDisplay : '0.00'} 
                </span>
             </div>
           </div>

           <div className="flex items-center justify-between gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                 <Wifi className="w-4 h-4 text-blue-400 shrink-0"/>
                 <span className="text-xs text-blue-300">Pegged to ETH</span>
              </div>
              <div className="text-xs text-blue-200 font-mono">
                 1 ETH ≈ {binanceEthPrice.toLocaleString()} U
              </div>
           </div>

           {!isConnected ? (
             <Button className="w-full h-14 bg-slate-700">Connect Wallet</Button>
           ) : (tradeSide === 'sell' && allowance !== undefined && allowance < parseEther('1000000')) ? (
             <Button onClick={handleApprove} disabled={isPending} className="w-full h-14 bg-yellow-600 text-white font-bold rounded-xl">{isPending ? <Loader2 className="animate-spin mr-2"/> : "1. Approve KIKI"}</Button>
           ) : (
             <Button onClick={handleTrade} disabled={isPending || !inputValue} className={`w-full h-14 font-bold text-lg rounded-xl shadow-lg transition-all active:scale-95 ${tradeSide === 'buy' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>
               {isPending ? <Loader2 className="animate-spin mr-2"/> : (tradeSide === 'buy' ? 'Confirm Buy' : 'Confirm Sell')}
             </Button>
           )}
        </div>
      </div>
    </div>
  )
}