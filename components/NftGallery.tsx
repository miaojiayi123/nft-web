'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, AlertCircle, Image as ImageIcon, ArrowUpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// NFT 合约地址
const CONTRACT_ADDRESS = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 

interface NFT {
  contract: { address: string };
  id: { tokenId: string };
  title: string;
  media: { gateway: string }[];
  level?: number; 
}

export function NftGallery() {
  const { address, isConnected, chain } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNFTs = async () => {
    if (!address || !chain) return;
    
    setIsLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      let networkPrefix = 'eth-sepolia';
      if (chain.id === 1) networkPrefix = 'eth-mainnet';
      
      const [alchemyRes, supabaseRes] = await Promise.all([
        fetch(`https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs?owner=${address}&withMetadata=true&contractAddresses[]=${CONTRACT_ADDRESS}`),
        supabase.from('nft_levels').select('*')
      ]);

      const alchemyData = await alchemyRes.json();
      const { data: levels } = supabaseRes;

      const levelMap = new Map();
      levels?.forEach((l: any) => levelMap.set(l.token_id, l.level));

      let myNfts: NFT[] = alchemyData.ownedNfts || [];
      myNfts = myNfts.map(nft => {
        const tokenIdDec = BigInt(nft.id.tokenId).toString();
        return {
          ...nft,
          level: levelMap.get(tokenIdDec) || 1 
        };
      });
      
      myNfts.sort((a, b) => {
        const levelA = a.level || 1;
        const levelB = b.level || 1;
        if (levelA !== levelB) return levelB - levelA; 
        return parseInt(a.id.tokenId, 16) - parseInt(b.id.tokenId, 16); 
      });
      
      setNfts(myNfts);
    } catch (error) {
      console.error("Failed to fetch NFTs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) fetchNFTs();
  }, [isConnected, address, chain]);

  // --- ✨ 视觉计算辅助函数 ---
  const getGlowStyles = (level: number) => {
    // 基础强度 (Lv1 = 0.2, 每升一级 +0.15, 上限 0.9)
    const intensity = Math.min(0.2 + (level - 1) * 0.15, 0.9);
    // 模糊半径 (Lv1 = xl, 等级越高越扩散)
    const blurAmount = level > 3 ? 'blur-2xl' : 'blur-xl';
    
    return {
      opacity: intensity,
      blurClass: blurAmount
    };
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
        <p className="font-mono text-sm">CONNECT WALLET TO VIEW ASSETS</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5">
             TOTAL: {nfts.length}
           </span>
        </div>
        <button 
          onClick={fetchNFTs} 
          disabled={isLoading}
          className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-white transition-colors group disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? <Loader2 className="animate-spin w-3 h-3" /> : <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />}
          REFRESH
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square bg-white/5 rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : nfts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white/5 rounded-2xl border border-white/5 border-dashed">
          <ImageIcon className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-slate-500 font-mono text-sm">NO ASSETS FOUND</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {nfts.map((nft, index) => {
            const randomDelay = Math.random() * 2; 
            const randomDuration = 4 + Math.random() * 2;
            const level = nft.level || 1;
            const glow = getGlowStyles(level);

            return (
              <motion.div
                key={`${nft.contract.address}-${nft.id.tokenId}`}
                animate={{ 
                  y: [0, -8, 0], 
                  rotate: [0, 1, -1, 0],
                }}
                transition={{ 
                  duration: randomDuration, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: randomDelay, 
                }}
                className="group relative perspective-1000"
              >
                {/* 🔥 1. 动态背景光晕 (Backlight) 
                   根据等级动态设置 opacity 和 blur
                */}
                <div 
                  className={`absolute -inset-0.5 bg-purple-600 rounded-2xl transition-opacity duration-500 group-hover:opacity-100 ${glow.blurClass}`}
                  style={{ opacity: 0 }} // 默认隐藏，Hover或高等级时显示
                ></div>
                
                {/* 对于高等级 (Lv2+)，让光晕在非 hover 状态下也隐约可见 */}
                {level > 1 && (
                   <div 
                     className={`absolute -inset-2 bg-purple-500 rounded-3xl ${glow.blurClass} transition-all duration-700`}
                     style={{ opacity: glow.opacity * 0.4 }} // 静态时显示 40% 的强度
                   ></div>
                )}

                {/* 2. 卡片容器 */}
                <div className={`relative aspect-square rounded-2xl overflow-hidden border bg-[#0B0C10] shadow-xl transition-all duration-300 z-10 ${level > 1 ? 'border-purple-500/50' : 'border-white/10 group-hover:border-purple-500/50'}`}>
                  
                  <img 
                    src={nft.media?.[0]?.gateway || '/kiki.png'} 
                    alt={nft.title} 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
                    onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'} 
                  />
                  
                  {/* 左上角 */}
                  <div className="absolute top-2 left-2">
                     <div className="bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[8px] font-mono text-slate-300 border border-white/10">
                       GENESIS
                     </div>
                  </div>

                  {/* 右上角: 等级 (视觉增强) */}
                  <div className="absolute top-2 right-2">
                     <div className={`backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${level > 1 ? 'bg-purple-600/90 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.6)]' : 'bg-black/60 text-slate-400 border-white/10'}`}>
                       {level > 1 && <ArrowUpCircle className="w-3 h-3 text-yellow-300 animate-pulse" />}
                       Lv. {level}
                     </div>
                  </div>

                  {/* 底部信息 */}
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm truncate">{nft.title || 'Unknown Asset'}</span>
                      <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                        #{parseInt(nft.id.tokenId, 16)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}