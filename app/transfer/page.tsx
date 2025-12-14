'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem'; // 👈 新增：用于解析事件
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, Send, CheckCircle2, Loader2, LayoutGrid, RefreshCw, 
  Wallet, ArrowRight, ShieldCheck, AlertCircle 
} from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import TokenBalance from '@/components/TokenBalance';

// ✅ 核心配置
const CONTRACT_ADDRESS = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390';

// ERC721 最小 ABI，用于转账和读取 tokenURI
const MINIMAL_ERC721_ABI = [
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
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  }
] as const;

interface NFT {
  contract: { address: string; name?: string };
  id: { tokenId: string };
  title: string;
  media: { gateway: string }[];
  isPendingIndexer?: boolean; // 👈 新增标记，用于 UI 区分
}

// 辅助：处理 IPFS 链接
const resolveIpfs = (url: string) => {
  if (!url) return '/kiki.png';
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return url;
};

export default function TransferPage() {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient(); // 👈 获取链上客户端
  
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [recipient, setRecipient] = useState('');

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // --- 🔥 核心逻辑：混合获取数据 ---
  const fetchNFTs = async () => {
    if (!address || !chain || !publicClient) return;
    setIsLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      const networkPrefix = chain.id === 1 ? 'eth-mainnet' : 'eth-sepolia';
      
      // 1️⃣  Alchemy 请求 (主力数据)
      const alchemyPromise = fetch(
        `https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs?owner=${address}&withMetadata=true&contractAddresses[]=${CONTRACT_ADDRESS}&t=${Date.now()}`,
        { cache: 'no-store' }
      ).then(res => res.json());

      // 2️⃣ 链上实时扫描 (补丁数据) - 扫描最近 1000 个区块的 Transfer 事件
      const currentBlock = await publicClient.getBlockNumber();
      const logsPromise = publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
        args: { to: address },
        fromBlock: currentBlock - 1000n, 
        toBlock: 'latest'
      });

      const [alchemyData, logs] = await Promise.all([alchemyPromise, logsPromise]);
      let finalNfts: NFT[] = alchemyData.ownedNfts || [];

      // 3️⃣ 找茬：对比链上日志和 Alchemy 数据
      // 提取 Alchemy 已有的 Token ID 集合
      const existingIds = new Set(finalNfts.map(n => BigInt(n.id.tokenId).toString()));
      
      // 提取链上发现的所有 Token ID (去重)
      const onChainIds = Array.from(new Set(logs.map(log => log.args.tokenId!.toString())));

      // 4️⃣ 补漏：找出 Alchemy 还没索引到的 ID
      const missingIds = onChainIds.filter(id => !existingIds.has(id));

      if (missingIds.length > 0) {
        console.log("⚠️ 检测到索引延迟，正在手动补全 ID:", missingIds);
        
        // 并行获取缺失 NFT 的 metadata
        const missingNfts = await Promise.all(missingIds.map(async (tokenId) => {
          try {
            // A. 直接读合约 tokenURI
            const tokenUri = await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: MINIMAL_ERC721_ABI,
              functionName: 'tokenURI',
              args: [BigInt(tokenId)],
            });

            // B. 请求 metadata JSON
            const httpUri = resolveIpfs(tokenUri);
            const metaRes = await fetch(httpUri);
            const metaJson = await metaRes.json();

            // C. 构造临时 NFT 对象
            return {
              contract: { address: CONTRACT_ADDRESS, name: "Project KIKI" },
              id: { tokenId: BigInt(tokenId).toString(16) }, // Alchemy 用 16 进制
              title: metaJson.name || `KIKI #${tokenId}`,
              media: [{ gateway: resolveIpfs(metaJson.image || metaJson.image_url) }],
              isPendingIndexer: true // 标记一下
            } as NFT;
          } catch (e) {
            console.error(`Failed to fetch manual metadata for ${tokenId}`, e);
            return null;
          }
        }));

        // 将手动获取的 NFT 插到列表最前面
        const validMissingNfts = missingNfts.filter((n): n is NFT => n !== null);
        finalNfts = [...validMissingNfts, ...finalNfts];
      }

      setNfts(finalNfts);
    } catch (error) {
      console.error("Failed to fetch NFTs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) fetchNFTs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, chain]);

  useEffect(() => {
    if (isConfirmed) {
      setRecipient('');
      setSelectedNft(null);
      // 交易确认后立即刷新，此时 Logs 扫描策略会生效
      setTimeout(fetchNFTs, 1000); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNft || !recipient || !address) return;

    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      alert("Invalid Wallet Address");
      return;
    }

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: MINIMAL_ERC721_ABI,
      functionName: 'transferFrom',
      args: [address, recipient as `0x${string}`, BigInt(selectedNft.id.tokenId)],
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 selection:bg-purple-500/30 font-sans">
      
      {/* 背景底噪 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        {/* 顶部导航 */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div className="flex flex-col gap-1">
            <Link href="/dashboard" className="inline-flex items-center text-xs font-mono text-slate-500 hover:text-blue-400 transition-colors mb-2 uppercase tracking-wide">
              <ArrowLeft className="mr-2 h-3 w-3" /> RETURN TO DASHBOARD
            </Link>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Send className="w-8 h-8 text-purple-500" />
              Asset Transfer
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-[#12141a]/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
            <TokenBalance />
            <ConnectButton />
          </div>
        </header>

        {/* 主内容区 */}
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* 左侧：NFT 选择区 */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-slate-500" />
                <h2 className="text-lg font-bold text-white tracking-wide">SELECT ASSET</h2>
              </div>
              
              <button 
                onClick={fetchNFTs} 
                disabled={isLoading}
                className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-white transition-colors group disabled:opacity-50 cursor-pointer outline-none uppercase tracking-wide"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin w-3 h-3" /> 
                ) : (
                  <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" /> 
                )}
                REFRESH
              </button>
            </div>

            {/* NFT Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-square bg-[#12141a] rounded-xl animate-pulse border border-white/5" />
                ))}
              </div>
            ) : nfts.length === 0 ? (
              <div className="text-center py-20 bg-[#12141a]/50 rounded-2xl border border-white/5 border-dashed">
                <p className="text-slate-500 font-mono text-sm">NO ASSETS FOUND</p>
                <Link href="/mint" className="text-xs text-blue-400 hover:underline mt-2 inline-block">Mint new assets &rarr;</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {nfts.map((nft) => {
                   const isSelected = selectedNft?.id.tokenId === nft.id.tokenId;
                   const imageUrl = nft.media?.[0]?.gateway || '/kiki.png';
                   const tokenIdDec = parseInt(nft.id.tokenId, 16).toString();

                   return (
                     <motion.div
                       key={`${nft.contract.address}-${nft.id.tokenId}`}
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       onClick={() => setSelectedNft(nft)}
                       className={`cursor-pointer relative rounded-xl overflow-hidden transition-all duration-300 ${
                         isSelected 
                           ? 'border-2 border-purple-500 ring-4 ring-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                           : 'border border-white/5 hover:border-white/20'
                       }`}
                     >
                       <div className="aspect-square bg-[#12141a] relative">
                         <img 
                            src={imageUrl} 
                            alt={nft.title} 
                            className={`w-full h-full object-cover transition-all ${isSelected ? '' : 'opacity-80 hover:opacity-100'}`}
                            onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'} 
                          />
                         
                         {/* ⚡️ 如果是手动抓取的实时数据，显示一个标记 */}
                         {nft.isPendingIndexer && (
                           <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 z-20">
                             <AlertCircle className="w-2 h-2" /> LIVE
                           </div>
                         )}

                         {isSelected && (
                           <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center backdrop-blur-[1px] z-10">
                             <CheckCircle2 className="w-10 h-10 text-white drop-shadow-lg" />
                           </div>
                         )}
                       </div>
                       <div className={`p-3 text-xs border-t ${isSelected ? 'bg-purple-900/20 border-purple-500/30' : 'bg-[#0e1016] border-white/5'}`}>
                         <p className="font-bold truncate text-slate-200">{nft.title || 'Unknown Asset'}</p>
                         <p className="text-slate-500 font-mono mt-1">ID: {tokenIdDec}</p>
                       </div>
                     </motion.div>
                   )
                })}
              </div>
            )}
          </div>

          {/* 右侧：发送表单 */}
          <div className="lg:w-[420px] shrink-0">
            <div className="sticky top-24">
              <Card className="bg-[#12141a] border-white/5 shadow-2xl overflow-hidden">
                {/* 装饰线 */}
                <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-blue-500"></div>
                
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white text-lg">
                    <ShieldCheck className="w-5 h-5 text-purple-500" /> 
                    Transaction Details
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  <form onSubmit={handleTransfer} className="space-y-8">
                    
                    {/* 1. 已选资产预览 */}
                    <div className="space-y-3">
                      <Label className="text-xs font-mono text-slate-500 uppercase tracking-wider">Selected Asset</Label>
                      {selectedNft ? (
                        <div className="flex items-center gap-4 p-3 bg-black/20 rounded-lg border border-purple-500/30 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors"></div>
                          <img 
                            src={selectedNft.media?.[0]?.gateway || '/kiki.png'} 
                            className="w-16 h-16 rounded-md object-cover bg-slate-800 border border-white/10 z-10"
                            onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'} 
                          />
                          <div className="overflow-hidden z-10">
                            <h4 className="font-bold text-sm truncate text-white">{selectedNft.title || 'NFT Asset'}</h4>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono border border-purple-500/20">ERC-721</span>
                               <span className="text-xs text-slate-500 font-mono">#{parseInt(selectedNft.id.tokenId, 16)}</span>
                               {selectedNft.isPendingIndexer && <span className="text-[8px] bg-yellow-500/20 text-yellow-300 px-1 rounded ml-1">LIVE</span>}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 border border-dashed border-white/10 rounded-lg text-center bg-black/20 flex flex-col items-center justify-center gap-2">
                          <LayoutGrid className="w-6 h-6 text-slate-600" />
                          <span className="text-slate-500 text-xs">Select an asset from the left</span>
                        </div>
                      )}
                    </div>

                    {/* 2. 接收地址 */}
                    <div className="space-y-3">
                      <Label htmlFor="to" className="text-xs font-mono text-slate-500 uppercase tracking-wider">Recipient Address</Label>
                      <div className="relative">
                        <Wallet className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                        <Input 
                          id="to"
                          placeholder="0x..." 
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          className="pl-10 bg-black/20 border-white/10 text-white font-mono focus:border-purple-500 focus:ring-purple-500/20 h-11"
                        />
                      </div>
                    </div>

                    {/* 3. 状态反馈 */}
                    <AnimatePresence>
                      {isConfirmed && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg flex items-center gap-2 overflow-hidden"
                        >
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> 
                          <span className="font-mono text-xs">Transfer Confirmed On-chain!</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 4. 提交按钮 */}
                    <Button 
                      type="submit" 
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-12 text-base shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all"
                      disabled={!selectedNft || !recipient || isPending || isConfirming}
                    >
                      {isPending || isConfirming ? (
                        <><Loader2 className="mr-2 animate-spin w-4 h-4" /> PROCESSING...</>
                      ) : (
                        <div className="flex items-center gap-2">
                           CONFIRM TRANSFER <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}