'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { ImageOff, ExternalLink } from 'lucide-react';

interface NFT {
  contract: { address: string; name?: string }; // 多加个 name
  id: { tokenId: string };
  title: string;
  description: string;
  media: { gateway: string }[];
}

export function NftGallery() {
  const { address, isConnected, chain } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address || !isConnected || !chain) return;

    const fetchNFTs = async () => {
      setIsLoading(true);
      setNfts([]);
      
      try {
        const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
        
        // 动态判断网络
        let networkPrefix = 'eth-mainnet';
        if (chain.id === 11155111) {
          networkPrefix = 'eth-sepolia';
        } else if (chain.id === 1) {
          networkPrefix = 'eth-mainnet';
        } else {
          setIsLoading(false);
          return;
        }

        const baseURL = `https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs`;
        const url = `${baseURL}?owner=${address}&withMetadata=true&pageSize=12`;

        const response = await fetch(url);
        const data = await response.json();
        
        // --- 修改点：不再过滤没图的 NFT ---
        // 我们只保留确实存在的 NFT (data.ownedNfts 可能为 null)
        const validNFTs = data.ownedNfts || [];

        setNfts(validNFTs);
      } catch (error) {
        console.error("Failed to fetch NFTs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, [address, isConnected, chain]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[260px] w-full rounded-xl bg-slate-800" />
        ))}
      </div>
    );
  }

  if (!isLoading && nfts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-slate-800 border-dashed rounded-xl bg-slate-900/20">
        <ImageOff className="w-10 h-10 mb-2 opacity-50" />
        <p>在当前网络 ({chain?.name}) 暂无 NFT</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
    >
      {nfts.map((nft, index) => {
        // --- 核心修改：处理没有图片的情况 ---
        const imageUrl = nft.media?.[0]?.gateway || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop';
        
        // 如果没有标题，就用 "合约名 #ID" 或者 "NFT #ID"
        const displayTitle = nft.title || `${nft.contract.name || 'NFT'} #${parseInt(nft.id.tokenId, 16)}`;

        return (
          <motion.div
            key={`${nft.contract.address}-${nft.id.tokenId}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 text-white overflow-hidden hover:scale-105 transition-transform duration-300 group cursor-pointer h-full flex flex-col">
              {/* 图片区域 */}
              <div className="aspect-square relative overflow-hidden bg-slate-800">
                <img 
                  src={imageUrl}
                  alt={displayTitle}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    // 图片加载失败时，显示默认图
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop';
                  }}
                />
                
                {/* 悬停显示 OpenSea 按钮 */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a 
                    href={`https://${chain?.id === 11155111 ? 'testnets.' : ''}opensea.io/assets/${chain?.id === 11155111 ? 'sepolia' : 'ethereum'}/${nft.contract.address}/${parseInt(nft.id.tokenId, 16)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-white font-bold border border-white/50 px-4 py-2 rounded-full hover:bg-white hover:text-black transition-colors"
                  >
                    OpenSea <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* 信息区域 */}
              <CardContent className="p-4 flex-1">
                <h3 className="font-bold truncate text-sm mb-1 text-slate-200" title={displayTitle}>
                  {displayTitle}
                </h3>
                <p className="text-xs text-slate-500 truncate font-mono">
                  ID: {parseInt(nft.id.tokenId, 16).toString()}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}