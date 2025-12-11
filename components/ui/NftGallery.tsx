'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton'; // 需要安装 shadcn 的 skeleton
import { motion } from 'framer-motion';
import { ImageOff, ExternalLink } from 'lucide-react';

// 定义 NFT 数据接口
interface NFT {
  contract: { address: string };
  id: { tokenId: string };
  title: string;
  description: string;
  media: { gateway: string }[];
}

export function NftGallery() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address || !isConnected) return;

    const fetchNFTs = async () => {
      setIsLoading(true);
      try {
        // 使用 Alchemy API (以太坊主网)
        // 注意：如果你想看测试网的 NFT，需要把 eth-mainnet 改成 eth-sepolia
        const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
        const baseURL = `https://eth-mainnet.g.alchemy.com/nft/v2/${apiKey}/getNFTs`;
        
        const url = `${baseURL}?owner=${address}&withMetadata=true&pageSize=12`;

        const response = await fetch(url);
        const data = await response.json();
        
        // 过滤掉没有图片的 NFT，防止页面太丑
        const validNFTs = data.ownedNfts?.filter((nft: NFT) => 
          nft.media && nft.media[0]?.gateway && nft.title
        ) || [];

        setNfts(validNFTs);
      } catch (error) {
        console.error("Failed to fetch NFTs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, [address, isConnected]);

  // 如果未连接或加载中，显示骨架屏
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[260px] w-full rounded-xl bg-slate-800" />
        ))}
      </div>
    );
  }

  // 如果没有 NFT
  if (!isLoading && nfts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-slate-800 border-dashed rounded-xl bg-slate-900/20">
        <ImageOff className="w-10 h-10 mb-2 opacity-50" />
        <p>此钱包在以太坊主网暂无 NFT</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
    >
      {nfts.map((nft, index) => (
        <motion.div
          key={`${nft.contract.address}-${nft.id.tokenId}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 text-white overflow-hidden hover:scale-105 transition-transform duration-300 group cursor-pointer">
            {/* 图片区域 */}
            <div className="aspect-square relative overflow-hidden bg-slate-800">
              <img 
                src={nft.media[0].gateway} 
                alt={nft.title}
                className="object-cover w-full h-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=No+Image';
                }}
              />
              {/* 悬停遮罩 */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a 
                  href={`https://opensea.io/assets/ethereum/${nft.contract.address}/${parseInt(nft.id.tokenId, 16)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-white font-bold border border-white/50 px-4 py-2 rounded-full hover:bg-white hover:text-black transition-colors"
                >
                  OpenSea <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* 信息区域 */}
            <CardContent className="p-4">
              <h3 className="font-bold truncate text-sm mb-1 text-slate-200" title={nft.title}>
                {nft.title}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                #{parseInt(nft.id.tokenId, 16)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}