'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, AlertCircle, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// NFT 合约地址
const CONTRACT_ADDRESS = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 

interface NFT {
  contract: { address: string };
  id: { tokenId: string };
  title: string;
  media: { gateway: string }[];
}

export function NftGallery() {
  const { address, isConnected, chain } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 获取 NFT 数据
  const fetchNFTs = async () => {
    if (!address || !chain) return;
    
    setIsLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      // 根据 Chain ID 判断网络 (默认 Sepolia)
      let networkPrefix = 'eth-sepolia';
      if (chain.id === 1) networkPrefix = 'eth-mainnet';
      
      const baseURL = `https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs`;
      const url = `${baseURL}?owner=${address}&withMetadata=true&contractAddresses[]=${CONTRACT_ADDRESS}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      // 简单排序：ID 小的在前
      const sorted = (data.ownedNfts || []).sort((a: NFT, b: NFT) => 
        parseInt(a.id.tokenId, 16) - parseInt(b.id.tokenId, 16)
      );
      
      setNfts(sorted);
    } catch (error) {
      console.error("Failed to fetch NFTs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) fetchNFTs();
  }, [isConnected, address, chain]);

  // 未连接状态
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
      {/* 顶部控制栏 */}
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
          {isLoading ? (
            <Loader2 className="animate-spin w-3 h-3" /> 
          ) : (
            <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" /> 
          )}
          REFRESH
        </button>
      </div>

      {/* NFT 网格 */}
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
            // ✅ 核心魔法：为每个卡片生成唯一的随机延迟，避免动作整齐划一
            const randomDelay = Math.random() * 2; 
            const randomDuration = 4 + Math.random() * 2; // 4~6秒的随机浮动周期

            return (
              <motion.div
                key={`${nft.contract.address}-${nft.id.tokenId}`}
                // 1. 悬浮动画
                animate={{ 
                  y: [0, -8, 0], // 上下浮动范围 (比 Mint 页稍微小一点，避免太乱)
                  rotate: [0, 1, -1, 0], // 极微小的旋转
                }}
                transition={{ 
                  duration: randomDuration, // 随机周期
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: randomDelay, // 随机延迟启动
                }}
                className="group relative perspective-1000"
              >
                {/* 2. 呼吸光晕 (Hover 时增强) */}
                <div className="absolute -inset-2 bg-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* 3. 卡片主体 */}
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-[#0B0C10] shadow-xl group-hover:border-purple-500/50 transition-colors duration-300">
                  <img 
                    src={nft.media?.[0]?.gateway || '/kiki.png'} 
                    alt={nft.title} 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
                    onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'} 
                  />
                  
                  {/* 左上角 Series 标签 */}
                  <div className="absolute top-2 left-2">
                     <div className="bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[8px] font-mono text-slate-300 border border-white/10">
                       GENESIS
                     </div>
                  </div>

                  {/* 底部 ID 标签 */}
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
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