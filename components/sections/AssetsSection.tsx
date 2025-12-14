'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Layers, RefreshCw, Loader2, Image as ImageIcon, ArrowUpCircle, Send, X, CheckCircle2, Wallet, ArrowRight, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 配置 ---
const NFT_CONTRACT = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 

// --- ABI ---
const nftAbi = [
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "tokenId", type: "uint256" }], name: "transferFrom", outputs: [], stateMutability: "nonpayable", type: "function" }
] as const;

interface NFT {
  id: { tokenId: string };
  title: string;
  media: { gateway: string }[];
  level?: number; 
  contract?: { address: string };
}

export default function AssetsSection() {
  const { address, isConnected, chain } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // 新增错误状态
  
  // Transfer State
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [recipient, setRecipient] = useState('');

  // --- 1. Fetch Logic ---
  const fetchNFTs = async () => {
    if (!address) {
      console.log("⏳ Assets: Waiting for wallet address...");
      return;
    }
    
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      if (!apiKey) throw new Error("API Key Missing in .env.local");

      // 默认使用 Sepolia，如果链 ID 是 1 则用 Mainnet
      const networkPrefix = chain?.id === 1 ? 'eth-mainnet' : 'eth-sepolia';
      
      const url = `https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs?owner=${address}&withMetadata=true&contractAddresses[]=${NFT_CONTRACT}`;
      
      console.log(`📡 Fetching Assets from: ${networkPrefix}`);

      // 增加 500ms 延迟，错峰请求，防止 SPA 并发导致 429 错误
      await new Promise(r => setTimeout(r, 500));

      const [alchemyRes, supabaseRes] = await Promise.all([
        fetch(url),
        supabase.from('nft_levels').select('*')
      ]);

      if (!alchemyRes.ok) {
        throw new Error(`Alchemy API Error: ${alchemyRes.status} ${alchemyRes.statusText}`);
      }

      const alchemyData = await alchemyRes.json();
      const levels = supabaseRes.data || [];

      // 构建等级映射表
      const levelMap = new Map();
      levels.forEach((l: any) => levelMap.set(l.token_id, l.level));

      // 合并数据
      let myNfts: NFT[] = (alchemyData.ownedNfts || []).map((nft: any) => {
        const tokenIdDec = BigInt(nft.id.tokenId).toString();
        return {
          ...nft,
          level: levelMap.get(tokenIdDec) || 1 
        };
      });
      
      // 排序
      myNfts.sort((a, b) => {
        const levelA = a.level || 1;
        const levelB = b.level || 1;
        if (levelA !== levelB) return levelB - levelA; 
        return parseInt(a.id.tokenId, 16) - parseInt(b.id.tokenId, 16); 
      });
      
      console.log(`✅ Loaded ${myNfts.length} assets`);
      setNfts(myNfts);

    } catch (error: any) {
      console.error("❌ Failed to fetch NFTs:", error);
      setErrorMsg(error.message || "Failed to load assets");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 核心修复：添加 `chain` 到依赖数组，确保网络切换或加载完成后重新触发
  useEffect(() => {
    if (isConnected && address) {
      fetchNFTs();
    }
  }, [isConnected, address, chain]);

  // --- 2. Transfer Logic ---
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
     if (isSuccess) {
        setTimeout(() => {
           setRecipient('');
           setSelectedNft(null);
           fetchNFTs(); // 成功后刷新
        }, 2000);
     }
  }, [isSuccess]);

  const handleTransfer = () => {
     if (!selectedNft || !recipient) return;
     
     if (!recipient.startsWith('0x') || recipient.length !== 42) {
       alert("Invalid Wallet Address");
       return;
     }

     writeContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: nftAbi,
        functionName: 'transferFrom',
        args: [address as `0x${string}`, recipient as `0x${string}`, BigInt(selectedNft.id.tokenId)]
     });
  };

  // --- 3. Visual Helpers ---
  const getGlowStyles = (level: number) => {
    const intensity = Math.min(0.2 + (level - 1) * 0.15, 0.9);
    const blurAmount = level > 3 ? 'blur-2xl' : 'blur-xl';
    return { opacity: intensity, blurClass: blurAmount };
  };

  return (
    <div className="relative p-1">
      
      {/* 🚀 Transfer Modal */}
      <AnimatePresence>
         {selectedNft && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            >
               <motion.div 
                 initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} 
                 className="bg-[#12141a] border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-[0_0_50px_rgba(0,0,0,0.5)] relative"
               >
                  <button onClick={() => setSelectedNft(null)} className="absolute top-4 right-4 z-20 text-slate-500 hover:text-white bg-black/50 rounded-full p-1"><X className="w-5 h-5"/></button>

                  {/* Left: Asset Preview */}
                  <div className="w-full md:w-2/5 bg-black relative flex flex-col justify-center items-center p-8 border-r border-white/5">
                     <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                        <img 
                           src={selectedNft.media?.[0]?.gateway || '/kiki.png'} 
                           className="w-full h-full object-cover" 
                           onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'}
                        />
                        <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg border border-white/20">
                           Lv.{selectedNft.level || 1}
                        </div>
                     </div>
                     <div className="mt-6 text-center">
                        <h3 className="text-xl font-bold text-white mb-1">Token #{BigInt(selectedNft.id.tokenId).toString()}</h3>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Genesis Edition</p>
                     </div>
                  </div>

                  {/* Right: Transfer Form */}
                  <div className="w-full md:w-3/5 p-8 flex flex-col bg-[#0e1015]">
                     <div className="flex items-center gap-2 mb-8">
                        <div className="p-2 bg-blue-500/10 rounded-lg"><ShieldCheck className="w-5 h-5 text-blue-500"/></div>
                        <h3 className="text-lg font-bold text-white">Transfer Asset</h3>
                     </div>
                     
                     <div className="flex-1 space-y-6">
                        <div className="space-y-3">
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                              <Wallet className="w-3 h-3" /> Recipient Address
                           </label>
                           <Input 
                              placeholder="0x..." 
                              value={recipient} 
                              onChange={e => setRecipient(e.target.value)} 
                              className="bg-[#1a1d26] border-white/10 text-white font-mono h-12 focus:border-blue-500/50"
                           />
                        </div>

                        <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                           <div className="flex items-start gap-3">
                              <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5" />
                              <div className="space-y-1">
                                 <p className="text-xs font-bold text-blue-300">Irreversible Action</p>
                                 <p className="text-[10px] text-blue-200/60 leading-relaxed">
                                    Once confirmed, this asset will be permanently moved to the recipient's wallet. You cannot undo this.
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="mt-8">
                        {isSuccess ? (
                           <div className="w-full h-12 bg-green-500/10 border border-green-500/20 text-green-400 font-bold rounded-xl flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5"/> Transfer Complete
                           </div>
                        ) : (
                           <Button 
                              onClick={handleTransfer} 
                              disabled={isPending || isConfirming || !recipient} 
                              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-lg shadow-blue-900/20"
                           >
                              {isPending || isConfirming ? <><Loader2 className="animate-spin mr-2"/> Processing...</> : <div className="flex items-center gap-2">CONFIRM TRANSFER <ArrowRight className="w-4 h-4"/></div>}
                           </Button>
                        )}
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* --- Section Header --- */}
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-pink-500/10 rounded-xl border border-pink-500/20">
               <Layers className="w-8 h-8 text-pink-500" />
            </div>
            <div>
               <h2 className="text-3xl font-bold text-white">My Assets</h2>
               <p className="text-slate-400">Manage & Transfer</p>
            </div>
         </div>
         <button 
            onClick={fetchNFTs} 
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10"
         >
            {isLoading ? <Loader2 className="animate-spin w-3 h-3"/> : <RefreshCw className="w-3 h-3"/>} 
            SYNC
         </button>
      </div>

      {/* --- Error Message Display --- */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3">
           <AlertTriangle className="w-5 h-5 shrink-0" />
           <div className="text-sm">
              <span className="font-bold">Error Loading Assets:</span> {errorMsg}
              <br/>
              <span className="text-xs opacity-70">Check your API Key and Network Connection.</span>
           </div>
        </div>
      )}

      {/* --- Gallery Grid --- */}
      {isLoading && nfts.length === 0 ? (
         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_,i)=><div key={i} className="aspect-square bg-white/5 rounded-2xl animate-pulse border border-white/5"/>)}
         </div>
      ) : nfts.length === 0 && !errorMsg ? (
         <div className="py-24 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/5 flex flex-col items-center justify-center gap-4">
            <ImageIcon className="w-10 h-10 opacity-50" />
            <p className="font-mono text-sm">NO ASSETS FOUND</p>
            <div className="text-xs text-slate-600">Wallet: {address?.slice(0,6)}...{address?.slice(-4)}</div>
         </div>
      ) : (
         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {nfts.map((nft) => {
               const level = nft.level || 1;
               const glow = getGlowStyles(level);
               const randomDelay = Math.random() * 0.5;

               return (
                  <motion.div 
                     key={`${nft.id.tokenId}-${level}`} 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: randomDelay }}
                     onClick={() => setSelectedNft(nft)} 
                     className="group relative cursor-pointer"
                  >
                     {/* Dynamic Glow (Only for Lv > 1) */}
                     {level > 1 && (
                        <div 
                           className={`absolute -inset-0.5 bg-purple-600 rounded-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 ${glow.blurClass}`}
                        />
                     )}

                     <div className={`relative aspect-square rounded-2xl overflow-hidden border bg-[#0B0C10] shadow-xl transition-all duration-300 ${level > 1 ? 'border-purple-500/40' : 'border-white/10 hover:border-blue-500/50'}`}>
                        <img 
                           src={nft.media?.[0]?.gateway || '/kiki.png'} 
                           className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
                           onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'}
                        />
                        
                        {/* Top Right: Level Badge */}
                        <div className="absolute top-2 right-2">
                           <div className={`backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${level > 1 ? 'bg-purple-600/90 text-white border-purple-400 shadow-lg' : 'bg-black/60 text-slate-400 border-white/10'}`}>
                              {level > 1 && <ArrowUpCircle className="w-3 h-3 text-yellow-300 animate-pulse" />}
                              Lv.{level}
                           </div>
                        </div>

                        {/* Hover Overlay: Transfer Action */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                           <span className="text-xs font-bold text-white flex items-center gap-2 bg-blue-600 px-4 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                              <Send className="w-3 h-3"/> TRANSFER
                           </span>
                        </div>

                        {/* Bottom Info */}
                        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none">
                           <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs truncate">#{parseInt(nft.id.tokenId, 16)}</span>
                              <span className="text-[10px] text-slate-400 font-mono">GENESIS</span>
                           </div>
                        </div>
                     </div>
                  </motion.div>
               )
            })}
         </div>
      )}
    </div>
  );
}