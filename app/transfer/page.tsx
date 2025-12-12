'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Send, Search, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';

// ERC721 标准 ABI (只包含 transferFrom)
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

// 定义 NFT 类型
interface NFT {
  contract: { address: string; name?: string };
  id: { tokenId: string };
  title: string;
  media: { gateway: string }[];
}

export default function TransferPage() {
  const { address, isConnected, chain } = useAccount();
  
  // 状态管理
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [recipient, setRecipient] = useState('');

  // 写入合约 Hooks
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // 1. 获取用户 NFT 列表 (复用 Alchemy 逻辑)
  const fetchNFTs = async () => {
    if (!address || !chain) return;
    setIsLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      let networkPrefix = 'eth-mainnet';
      if (chain.id === 11155111) networkPrefix = 'eth-sepolia';
      else if (chain.id === 1) networkPrefix = 'eth-mainnet';
      else { setIsLoading(false); return; }

      const baseURL = `https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs`;
      const url = `${baseURL}?owner=${address}&withMetadata=true&pageSize=100`; // 获取更多以便选择

      const response = await fetch(url);
      const data = await response.json();
      setNfts(data.ownedNfts || []);
    } catch (error) {
      console.error("Failed to fetch NFTs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) fetchNFTs();
  }, [isConnected, address, chain]);

  // 交易成功后刷新列表并清空选择
  useEffect(() => {
    if (isConfirmed) {
      setRecipient('');
      setSelectedNft(null);
      setTimeout(fetchNFTs, 2000); // 延迟刷新
    }
  }, [isConfirmed]);

  // 2. 执行转账
  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNft || !recipient || !address) return;

    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      alert("请输入正确的钱包地址 (0x...)");
      return;
    }

    writeContract({
      address: selectedNft.contract.address as `0x${string}`,
      abi: erc721Abi,
      functionName: 'transferFrom',
      args: [address, recipient as `0x${string}`, BigInt(selectedNft.id.tokenId)],
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30">
      
      {/* 顶部导航 */}
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> 返回控制台
            </Button>
          </Link>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* 左侧：NFT 选择区 */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <ImageIcon className="text-blue-500" /> 选择 NFT
              </h1>
              <Button variant="outline" size="sm" onClick={fetchNFTs} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : '刷新列表'}
              </Button>
            </div>

            {/* NFT 网格 */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-square bg-slate-800/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : nfts.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-white/5 border-dashed">
                <p className="text-slate-500">暂无可用 NFT</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {nfts.map((nft) => {
                   const isSelected = selectedNft?.id.tokenId === nft.id.tokenId && selectedNft?.contract.address === nft.contract.address;
                   const imageUrl = nft.media?.[0]?.gateway || '/kiki.png';
                   const tokenIdDec = parseInt(nft.id.tokenId, 16).toString();

                   return (
                     <motion.div
                       key={`${nft.contract.address}-${nft.id.tokenId}`}
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       onClick={() => setSelectedNft(nft)}
                       className={`cursor-pointer relative rounded-xl overflow-hidden border-2 transition-all ${
                         isSelected ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-transparent hover:border-slate-600'
                       }`}
                     >
                       <div className="aspect-square bg-slate-800 relative">
                         <img src={imageUrl} alt={nft.title} className="w-full h-full object-cover" 
                              onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'} />
                         {isSelected && (
                           <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                             <CheckCircle2 className="w-10 h-10 text-white drop-shadow-lg" />
                           </div>
                         )}
                       </div>
                       <div className="p-3 bg-slate-900/90 text-xs">
                         <p className="font-bold truncate text-white">{nft.title || 'Unknown NFT'}</p>
                         <p className="text-slate-500 font-mono">#{tokenIdDec}</p>
                       </div>
                     </motion.div>
                   )
                })}
              </div>
            )}
          </div>

          {/* 右侧：发送表单 (固定位置) */}
          <div className="lg:w-[400px]">
            <div className="sticky top-24">
              <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-400">
                    <Send className="w-5 h-5" /> 发送详情
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTransfer} className="space-y-6">
                    
                    {/* 选中的 NFT 预览 */}
                    <div className="space-y-2">
                      <Label className="text-slate-400">已选资产</Label>
                      {selectedNft ? (
                        <div className="flex items-center gap-4 p-3 bg-black/40 rounded-lg border border-blue-500/30">
                          <img 
                            src={selectedNft.media?.[0]?.gateway || '/kiki.png'} 
                            className="w-16 h-16 rounded-md object-cover bg-slate-800"
                            onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'} 
                          />
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-sm truncate text-white">{selectedNft.title || 'NFT'}</h4>
                            <p className="text-xs text-slate-500 font-mono">
                              ID: {parseInt(selectedNft.id.tokenId, 16)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 border border-dashed border-slate-700 rounded-lg text-center text-slate-500 text-sm bg-black/20">
                          请从左侧选择一个 NFT
                        </div>
                      )}
                    </div>

                    {/* 接收地址 */}
                    <div className="space-y-2">
                      <Label htmlFor="to" className="text-slate-400">接收者地址</Label>
                      <Input 
                        id="to"
                        placeholder="0x..." 
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="bg-black/40 border-slate-700 text-white font-mono focus:border-blue-500"
                      />
                    </div>

                    {/* 状态提示 */}
                    <AnimatePresence>
                      {isConfirmed && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" /> 发送成功！
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 按钮 */}
                    <Button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-lg"
                      disabled={!selectedNft || !recipient || isPending || isConfirming}
                    >
                      {isPending ? (
                        <><Loader2 className="mr-2 animate-spin" /> 请签名...</>
                      ) : isConfirming ? (
                        <><Loader2 className="mr-2 animate-spin" /> 确认中...</>
                      ) : (
                        "确认发送"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}