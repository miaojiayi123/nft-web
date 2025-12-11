'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { ImageOff, ExternalLink } from 'lucide-react';

interface NFT {
  contract: { address: string };
  id: { tokenId: string };
  title: string;
  description: string;
  media: { gateway: string }[];
}

export function NftGallery() {
  const { address, isConnected, chain } = useAccount(); // 多获取一个 chain 对象
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address || !isConnected || !chain) return;

    const fetchNFTs = async () => {
      setIsLoading(true);
      setNfts([]); // 切换网络时先清空旧数据
      
      try {
        const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
        
        // 动态判断网络
        let networkPrefix = 'eth-mainnet'; // 默认主网
        if (chain.id === 11155111) {
          networkPrefix = 'eth-sepolia';   // 如果是 Sepolia ID，就切到测试网
        } else if (chain.id === 1) {
          networkPrefix = 'eth-mainnet';
        } else {
          // 如果连了其他不支持的网（比如 Base），暂时就不查了，或者你可以扩展更多
          console.log("当前网络暂未配置 NFT 查询");
          setIsLoading(false);
          return;
        }

        const baseURL = `https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs`;
        const url = `${baseURL}?owner=${address}&withMetadata=true&pageSize=12`;

        const response = await fetch(url);
        const data = await response.json();
        
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
  }, [address, isConnected, chain]); // 监听 chain 的变化

  // 加载骨架屏
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[260px] w-full rounded-xl bg-slate-800" />
        ))}
      </div>
    );
  }

  // 空状态提示
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
      {nfts.map((nft, index) => (
        <motion.div
          key={`${nft.contract.address}-${nft.id.tokenId}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 text-white overflow-hidden hover:scale-105 transition-transform duration-300 group cursor-pointer h-full flex flex-col">
            <div className="aspect-square relative overflow-hidden bg-slate-800">
              <img 
                src={nft.media[0].gateway} 
                alt={nft.title}
                className="object-cover w-full h-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=No+Image';
                }}
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a 
                  // 这里也要动态链接，Sepolia 的 OpenSea 地址不一样
                  href={`https://${chain?.id === 11155111 ? 'testnets.' : ''}opensea.io/assets/${chain?.id === 11155111 ? 'sepolia' : 'ethereum'}/${nft.contract.address}/${parseInt(nft.id.tokenId, 16)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-white font-bold border border-white/50 px-4 py-2 rounded-full hover:bg-white hover:text-black transition-colors"
                >
                  OpenSea <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <CardContent className="p-4 flex-1">
              <h3 className="font-bold truncate text-sm mb-1 text-slate-200" title={nft.title}>
                {nft.title}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                #{parseInt(nft.id.tokenId, 16).toString()}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}