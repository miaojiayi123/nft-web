'use client';

import { useEffect, useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { ImageOff, ExternalLink, Trash2, Loader2 } from 'lucide-react';

// 标准 ERC721 ABI，只需要 transferFrom
const erc721Abi = [
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" }
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  }
] as const;

// 🔥 黑洞地址 (销毁地址)
const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';

interface NFT {
  contract: { address: string; name?: string };
  id: { tokenId: string };
  title: string;
  description: string;
  media: { gateway: string }[];
}

export function NftGallery() {
  const { address, isConnected, chain } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 记录当前正在销毁的 NFT ID，用于显示 loading 状态
  const [burningId, setBurningId] = useState<string | null>(null);

  // 写合约 Hook
  const { data: hash, writeContract, isPending } = useWriteContract();
  
  // 等待交易确认 Hook
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // 1. 获取 NFT 列表
  const fetchNFTs = async () => {
    if (!address || !isConnected || !chain) return;
    setIsLoading(true);
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      let networkPrefix = 'eth-mainnet';
      if (chain.id === 11155111) networkPrefix = 'eth-sepolia';
      else if (chain.id === 1) networkPrefix = 'eth-mainnet';
      else { setIsLoading(false); return; }

      const baseURL = `https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs`;
      const url = `${baseURL}?owner=${address}&withMetadata=true&pageSize=12`;

      const response = await fetch(url);
      const data = await response.json();
      const validNFTs = data.ownedNfts || [];
      setNfts(validNFTs);
    } catch (error) {
      console.error("Failed to fetch NFTs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNFTs();
  }, [address, isConnected, chain]);

  // 2. 监听销毁成功 -> 刷新列表
  useEffect(() => {
    if (isConfirmed) {
      setBurningId(null); // 清除 loading 状态
      // 延迟一点刷新，给 Alchemy 索引一点时间
      setTimeout(() => {
        fetchNFTs();
      }, 2000);
    }
  }, [isConfirmed]);

  // 3. 执行销毁操作
  const handleBurn = (contractAddress: string, tokenId: string) => {
    if (!address) return;
    
    setBurningId(tokenId); // 标记正在销毁这个 ID

    writeContract({
      address: contractAddress as `0x${string}`,
      abi: erc721Abi,
      functionName: 'transferFrom',
      args: [address, BURN_ADDRESS, BigInt(tokenId)],
    }, {
      onError: () => setBurningId(null) // 如果用户拒绝签名，取消 loading
    });
  };

  if (isLoading && nfts.length === 0) {
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
      <AnimatePresence>
        {nfts.map((nft, index) => {
          const imageUrl = nft.media?.[0]?.gateway || '/kiki.png';
          const tokenIdHex = nft.id.tokenId;
          const tokenIdDec = parseInt(tokenIdHex, 16).toString();
          const displayTitle = nft.title || `${nft.contract.name || 'NFT'} #${tokenIdDec}`;
          
          const isBurning = burningId === tokenIdHex;

          return (
            <motion.div
              key={`${nft.contract.address}-${tokenIdHex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.05 }}
              layout
            >
              <Card className="bg-slate-900/50 border-slate-800 text-white overflow-hidden hover:border-slate-600 transition-all group relative h-full flex flex-col">
                
                {/* --- 销毁按钮 --- */}
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full shadow-lg" disabled={isBurning}>
                        {isBurning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>确定要销毁这个 NFT 吗？</AlertDialogTitle>
                        {/* 👇 这里修复了闭合标签 */}
                        <AlertDialogDescription className="text-slate-400">
                          此操作不可逆！<br/>
                          你将把 <span className="text-white font-bold">#{tokenIdDec}</span> 发送到黑洞地址，它将永远消失。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-slate-700 hover:bg-slate-800 text-white">取消</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleBurn(nft.contract.address, tokenIdHex)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          确认销毁 (Burn)
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* 图片区域 */}
                <div className="aspect-square relative overflow-hidden bg-slate-800">
                  <img 
                    src={imageUrl}
                    alt={displayTitle}
                    className={`object-cover w-full h-full transition-all duration-500 ${isBurning ? 'grayscale blur-sm' : 'group-hover:scale-110'}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/kiki.png';
                    }}
                  />
                  
                  {/* Opensea 链接 */}
                  {!isBurning && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="pointer-events-auto">
                        <a 
                          href={`https://${chain?.id === 11155111 ? 'testnets.' : ''}opensea.io/assets/${chain?.id === 11155111 ? 'sepolia' : 'ethereum'}/${nft.contract.address}/${tokenIdDec}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-white font-bold border border-white/50 px-4 py-2 rounded-full hover:bg-white hover:text-black transition-colors text-xs"
                        >
                          OpenSea <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* 信息区域 */}
                <CardContent className="p-4 flex-1 relative">
                  {isBurning && (
                    <div className="absolute inset-0 bg-slate-900/80 z-20 flex items-center justify-center gap-2 text-red-500 text-sm font-bold animate-pulse">
                       <Loader2 className="w-4 h-4 animate-spin" /> 销毁中...
                    </div>
                  )}
                  <h3 className="font-bold truncate text-sm mb-1 text-slate-200" title={displayTitle}>
                    {displayTitle}
                  </h3>
                  <p className="text-xs text-slate-500 truncate font-mono">
                    Token ID: {tokenIdDec}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}