'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, usePublicClient } from 'wagmi'; // ✅ 新增 usePublicClient
import { parseEther, parseAbiItem } from 'viem'; // ✅ 新增 parseAbiItem
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Tag, Search, Loader2, Coins, 
  Store, CheckCircle2, List, Trash2, ArrowRight, AlertCircle, X, ShoppingBag, Gavel, ArrowLeft 
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import TokenBalance from '@/components/TokenBalance';

// --- 🔧 配置 ---
const NFT_CONTRACT = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 
const TOKEN_CONTRACT = '0x83F7A90486697B8B881319FbADaabF337fE2c60c'; 
const ADMIN_WALLET = '0x0752bddacb7b73e26a45e2b16cdea53311f46f7c'; 

// ABI
const nftAbi = [
  { inputs: [{name: "operator", type: "address"}, {name: "approved", type: "bool"}], name: "setApprovalForAll", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{name: "owner", type: "address"}, {name: "operator", type: "address"}], name: "isApprovedForAll", outputs: [{name: "", type: "bool"}], stateMutability: "view", type: "function" }
] as const;

const tokenAbi = [
  { inputs: [{name: "spender", type: "address"}, {name: "amount", type: "uint256"}], name: "approve", outputs: [{type: "bool"}], stateMutability: "nonpayable", type: "function" },
  { inputs: [{name: "owner", type: "address"}, {name: "spender", type: "address"}], name: "allowance", outputs: [{type: "uint256"}], stateMutability: "view", type: "function" }
] as const;

// ✅ 新增：最小 ABI 用于读取 tokenURI
const MINIMAL_ERC721_ABI = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  }
] as const;

// ✅ 新增：IPFS 解析辅助函数
const resolveIpfs = (url: string) => {
  if (!url) return '/kiki.png';
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return url;
};

interface MarketItem {
  id: number;
  token_id: string;
  seller_address: string;
  price: number;
  image?: string;
}

// ✅ 定义 Inventory Item 接口 (包含实时标记)
interface InventoryItem {
  id: { tokenId: string };
  title?: string;
  media?: { gateway: string }[];
  isPendingIndexer?: boolean; // 新增标记
}

export default function MarketPage() {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient(); // ✅ 获取链上客户端
  const [activeTab, setActiveTab] = useState<'explore' | 'sell' | 'mine'>('explore');
  
  // Data
  const [listings, setListings] = useState<MarketItem[]>([]); 
  const [myListings, setMyListings] = useState<MarketItem[]>([]); 
  const [myInventory, setMyInventory] = useState<InventoryItem[]>([]); 
  const [loading, setLoading] = useState(false);

  // Form State
  const [sellPrice, setSellPrice] = useState('');
  const [selectedSellId, setSelectedSellId] = useState<string | null>(null);
  
  // Loading State
  const [processing, setProcessing] = useState(false);

  // --- 🟢 Modal States ---
  const [buyModal, setBuyModal] = useState<{ isOpen: boolean; item: MarketItem | null }>({ isOpen: false, item: null });
  const [listModal, setListModal] = useState<{ isOpen: boolean; tokenId: string; price: string; image: string } | null>(null);
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; item: MarketItem | null }>({ isOpen: false, item: null });
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; title: string; desc: string }>({ isOpen: false, title: '', desc: '' });

  // --- 1. Fetch Data (Hybrid Strategy) ---
  const fetchData = async () => {
    if (!publicClient) return;
    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      const network = chain?.id === 1 ? 'eth-mainnet' : 'eth-sepolia';
      const timestamp = new Date().getTime();
      
      // --- A. 获取市场列表 (Supabase) ---
      const { data: activeListings } = await supabase
        .from('market_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // 丰富列表元数据 (带 Fallback 机制)
      const enrichedListings = await Promise.all((activeListings || []).map(async (item) => {
         try {
           // 1. 尝试 Alchemy
           const metaUrl = `https://${network}.g.alchemy.com/nft/v2/${apiKey}/getNFTMetadata?contractAddress=${NFT_CONTRACT}&tokenId=${item.token_id}&withMetadata=true&t=${timestamp}`;
           const metaRes = await fetch(metaUrl,{ cache: 'no-store' });
           const metaData = await metaRes.json();
           let imageUrl = metaData.media?.[0]?.gateway;

           // 2. 如果 Alchemy 没图，尝试链上读取
           if (!imageUrl) {
              const tokenUri = await publicClient.readContract({
                address: NFT_CONTRACT,
                abi: MINIMAL_ERC721_ABI,
                functionName: 'tokenURI',
                args: [BigInt(item.token_id)],
              });
              const meta = await fetch(resolveIpfs(tokenUri)).then(r => r.json());
              imageUrl = resolveIpfs(meta.image || meta.image_url);
           }
           
           return { ...item, image: imageUrl || '/kiki.png' };
         } catch {
           return { ...item, image: '/kiki.png' };
         }
      }));

      setListings(enrichedListings);
      if (address) {
        setMyListings(enrichedListings.filter(l => l.seller_address.toLowerCase() === address.toLowerCase()));
      }

      // --- B. 获取我的库存 (混合模式：Alchemy + 链上日志) ---
      let myNfts: InventoryItem[] = [];
      if (address) {
        const currentBlock = await publicClient.getBlockNumber();

        // 1. 并行请求：Alchemy API + 链上 Logs
        const [alchemyRes, logs] = await Promise.all([
           fetch(
             `https://${network}.g.alchemy.com/nft/v2/${apiKey}/getNFTs?owner=${address}&contractAddresses[]=${NFT_CONTRACT}&withMetadata=true&t=${timestamp}`,
             { cache: 'no-store', headers: {'Cache-Control': 'no-cache'} }
           ).then(r => r.json()),
           
           publicClient.getLogs({
             address: NFT_CONTRACT,
             event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
             args: { to: address },
             fromBlock: currentBlock - 1000n, 
             toBlock: 'latest'
           })
        ]);

        myNfts = alchemyRes.ownedNfts || [];

        // 2. 补全 Alchemy 缺失的 NFT
        const existingIds = new Set(myNfts.map(n => BigInt(n.id.tokenId).toString()));
        const onChainIds = Array.from(new Set(logs.map(log => log.args.tokenId!.toString())));
        const missingIds = onChainIds.filter(id => !existingIds.has(id));

        if (missingIds.length > 0) {
           console.log("⚠️ [Market] Found missing NFTs:", missingIds);
           const manualNfts = await Promise.all(missingIds.map(async (tokenId) => {
             try {
                const tokenUri = await publicClient.readContract({
                    address: NFT_CONTRACT,
                    abi: MINIMAL_ERC721_ABI,
                    functionName: 'tokenURI',
                    args: [BigInt(tokenId)],
                });
                const httpUri = resolveIpfs(tokenUri);
                const metaRes = await fetch(httpUri);
                const metaJson = await metaRes.json();
                
                return {
                    id: { tokenId: BigInt(tokenId).toString(16) }, 
                    title: metaJson.name || `KIKI #${tokenId}`,
                    media: [{ gateway: resolveIpfs(metaJson.image || metaJson.image_url) }],
                    isPendingIndexer: true // 标记
                } as InventoryItem;
             } catch (e) { return null; }
           }));
           const validManualNfts = manualNfts.filter((n): n is InventoryItem => n !== null);
           myNfts = [...validManualNfts, ...myNfts];
        }
      }

      // 过滤掉已上架的 NFT
      const myListedIds = new Set(enrichedListings.filter(l => l.seller_address.toLowerCase() === address?.toLowerCase()).map(l => l.token_id));
      const myAvailable = myNfts.filter((n) => !myListedIds.has(BigInt(n.id.tokenId).toString()));
      
      // 排序：优先显示 LIVE 数据
      myAvailable.sort((a, b) => (b.isPendingIndexer ? 1 : 0) - (a.isPendingIndexer ? 1 : 0));

      setMyInventory(myAvailable);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  // --- 2. Action: List Item ---
  const { writeContractAsync: writeContract } = useWriteContract();
  
  const { data: isApprovedForAll } = useReadContract({
    address: NFT_CONTRACT, abi: nftAbi, functionName: 'isApprovedForAll',
    args: address ? [address, ADMIN_WALLET] : undefined
  });

  const openListModal = () => {
    if (!selectedSellId || !sellPrice) return;
    const selectedNFT = myInventory.find(n => BigInt(n.id.tokenId).toString() === selectedSellId);
    const image = selectedNFT?.media?.[0]?.gateway || '/kiki.png';
    
    setListModal({ isOpen: true, tokenId: selectedSellId, price: sellPrice, image });
  };

  const confirmList = async () => {
    if (!listModal) return;
    setProcessing(true);
    try {
      if (!isApprovedForAll) {
        await writeContract({
          address: NFT_CONTRACT, abi: nftAbi, functionName: 'setApprovalForAll',
          args: [ADMIN_WALLET, true]
        });
        await new Promise(r => setTimeout(r, 4000));
      }

      const { error } = await supabase.from('market_listings').insert([{
        token_id: listModal.tokenId,
        seller_address: address?.toLowerCase(),
        price: parseFloat(listModal.price),
        status: 'active'
      }]);

      if (error) throw error;
      
      setListModal(null);
      setSuccessModal({ isOpen: true, title: 'Item Listed', desc: `Token #${listModal.tokenId} is now on the market.` });
      
      setSellPrice('');
      setSelectedSellId(null);
      setActiveTab('mine');
      fetchData();

    } catch (e: any) {
      alert('Listing failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- 3. Action: Buy Item ---
  const confirmBuy = async () => {
    const item = buyModal.item;
    if (!item || !address) return;
    setProcessing(true);
    
    try {
      const priceWei = parseEther(item.price.toString());
      try {
        await writeContract({
          address: TOKEN_CONTRACT, abi: tokenAbi, functionName: 'approve',
          args: [ADMIN_WALLET, priceWei]
        });
        await new Promise(r => setTimeout(r, 4000));
      } catch (err) {
        console.log("Approve skipped", err);
      }

      const res = await fetch('/api/market/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerAddress: address, listingId: item.id })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setBuyModal({ isOpen: false, item: null });
      setSuccessModal({ isOpen: true, title: 'Purchase Successful', desc: `Token #${item.token_id} has been added to your inventory.` });
      
      fetchData();

    } catch (e: any) {
      alert('Purchase failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- 4. Action: Cancel Listing ---
  const confirmCancel = async () => {
    const item = cancelModal.item;
    if (!item || !address) return;
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('market_listings')
        .delete()
        .eq('id', item.id)
        .eq('seller_address', address.toLowerCase());

      if (error) throw error;

      setMyListings(prev => prev.filter(l => l.id !== item.id));
      setListings(prev => prev.filter(l => l.id !== item.id));
      setCancelModal({ isOpen: false, item: null });
      
    } catch (e: any) {
      alert('Cancel failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  // 🖼️ 辅助：获取当前选中 NFT 的预览图
  const getSelectedSellImage = () => {
    if (!selectedSellId) return '/kiki.png';
    const nft = myInventory.find(n => BigInt(n.id.tokenId).toString() === selectedSellId);
    return nft?.media?.[0]?.gateway || '/kiki.png';
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-200 font-sans selection:bg-purple-500/30">
      
      {/* ⚠️ 1. Cancel Confirmation Modal */}
      <AnimatePresence>
        {cancelModal.isOpen && cancelModal.item && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-[#12141a] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="w-6 h-6" />
                  <h3 className="text-lg font-bold text-white">Revoke Listing?</h3>
                </div>
                <button onClick={() => setCancelModal({ isOpen: false, item: null })} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5 mb-6">
                 <img src={cancelModal.item.image || '/kiki.png'} className="w-12 h-12 rounded-lg object-cover bg-black" />
                 <div>
                    <div className="text-sm font-bold text-white">Token #{cancelModal.item.token_id}</div>
                    <div className="text-xs text-slate-500">Listed for {cancelModal.item.price} KIKI</div>
                 </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCancelModal({ isOpen: false, item: null })} className="flex-1 border-white/10 hover:bg-white/5 h-10 text-slate-300">Keep It</Button>
                <Button onClick={confirmCancel} disabled={processing} className="flex-1 bg-red-600 hover:bg-red-500 text-white h-10 font-bold">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin"/> : "Confirm Revoke"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🛍️ 2. Buy Confirmation Modal */}
      <AnimatePresence>
        {buyModal.isOpen && buyModal.item && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-[#12141a] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 text-indigo-400">
                  <ShoppingBag className="w-6 h-6" />
                  <h3 className="text-lg font-bold text-white">Confirm Purchase</h3>
                </div>
                <button onClick={() => setBuyModal({ isOpen: false, item: null })} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="text-center mb-6">
                 <div className="w-24 h-24 mx-auto bg-black rounded-xl border border-white/10 overflow-hidden mb-4 relative">
                    <img src={buyModal.item.image || '/kiki.png'} className="w-full h-full object-cover" />
                 </div>
                 <div className="text-2xl font-bold text-white font-mono">{buyModal.item.price} KIKI</div>
                 <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Total Cost</div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setBuyModal({ isOpen: false, item: null })} className="flex-1 border-white/10 hover:bg-white/5 h-12 text-slate-300">Cancel</Button>
                <Button onClick={confirmBuy} disabled={processing} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white h-12 font-bold">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : "Pay Now"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🏷️ 3. List Confirmation Modal */}
      <AnimatePresence>
        {listModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-[#12141a] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 text-green-400">
                  <Gavel className="w-6 h-6" />
                  <h3 className="text-lg font-bold text-white">Confirm Listing</h3>
                </div>
                <button onClick={() => setListModal(null)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5 mb-6">
                 <img src={listModal.image} className="w-16 h-16 rounded-lg object-cover bg-black" />
                 <div>
                    <div className="text-sm font-bold text-white">Token #{listModal.tokenId}</div>
                    <div className="text-xs text-slate-500 mb-1">Listing Price</div>
                    <div className="text-lg font-mono font-bold text-yellow-400 flex items-center gap-1"><Coins className="w-4 h-4"/> {listModal.price}</div>
                 </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setListModal(null)} className="flex-1 border-white/10 hover:bg-white/5 h-12 text-slate-300">Edit</Button>
                <Button onClick={confirmList} disabled={processing} className="flex-1 bg-green-600 hover:bg-green-500 text-white h-12 font-bold">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : "List Item"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎉 4. Success Modal */}
      <AnimatePresence>
        {successModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              className="bg-[#161A1E] border border-green-500/30 w-full max-w-sm rounded-3xl p-8 shadow-[0_0_50px_rgba(34,197,94,0.2)] text-center relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{successModal.title}</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">{successModal.desc}</p>
              <Button onClick={() => setSuccessModal({ ...successModal, isOpen: false })} className="w-full h-12 bg-white text-black hover:bg-slate-200 font-bold rounded-xl">Awesome</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-[500px] bg-indigo-900/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:30px_30px] opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex flex-col gap-1">
            <Link href="/dashboard" className="inline-flex items-center text-xs font-mono text-slate-500 hover:text-indigo-400 transition-colors mb-2 uppercase tracking-wide">
              <ArrowLeft className="mr-2 h-3 w-3" /> RETURN TO DASHBOARD
            </Link>
            <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <Store className="w-10 h-10 text-indigo-500" />
              Black Market
            </h1>
            <p className="text-slate-400 text-sm">P2P Asset Exchange. Zero royalty. Gasless listings.</p>
          </div>
          <div className="flex items-center gap-4 bg-[#12141a]/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
            <TokenBalance />
            <ConnectButton />
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-6 mb-8 border-b border-white/10 px-2">
          <button 
            onClick={() => setActiveTab('explore')}
            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${activeTab === 'explore' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-white'}`}
          >
            <Search className="w-4 h-4"/> Explore
          </button>
          <button 
            onClick={() => setActiveTab('sell')}
            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${activeTab === 'sell' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-white'}`}
          >
            <Tag className="w-4 h-4"/> Sell ({myInventory.length})
          </button>
          <button 
            onClick={() => setActiveTab('mine')}
            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${activeTab === 'mine' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-white'}`}
          >
            <List className="w-4 h-4"/> My Listings ({myListings.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          
          {/* TAB 1: EXPLORE */}
          {activeTab === 'explore' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading && listings.length === 0 ? (
                 <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500"/></div>
              ) : listings.length === 0 ? (
                 <div className="col-span-full py-20 text-center text-slate-500 bg-white/5 rounded-2xl border border-white/5 border-dashed">No active listings found.</div>
              ) : (
                 listings.map(item => {
                   const isMine = item.seller_address.toLowerCase() === address?.toLowerCase();
                   return (
                     <motion.div 
                       key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                       className="bg-[#12141a] border border-white/10 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all group relative"
                     >
                       <div className="aspect-square bg-black relative">
                         <img src={item.image} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                         {isMine && <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-white border border-white/20">YOU</div>}
                       </div>
                       <div className="p-4">
                         <div className="flex justify-between items-start mb-4">
                           <div>
                             <div className="text-xs text-slate-500 font-mono">GENESIS #{item.token_id}</div>
                             <div className="text-lg font-bold text-white">Token #{item.token_id}</div>
                           </div>
                         </div>
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-1.5 text-yellow-400 font-mono font-bold text-lg">
                             <Coins className="w-4 h-4" /> {item.price}
                           </div>
                           {isMine ? (
                             <Button size="sm" variant="outline" disabled className="border-white/10 text-slate-500 h-9 px-4 opacity-50">YOURS</Button>
                           ) : (
                             <Button 
                               size="sm" onClick={() => setBuyModal({ isOpen: true, item })} 
                               className="bg-indigo-600 hover:bg-indigo-500 text-white h-9 px-4"
                             >
                               BUY
                             </Button>
                           )}
                         </div>
                       </div>
                     </motion.div>
                   )
                 })
              )}
            </div>
          )}

          {/* TAB 2: SELL */}
          {activeTab === 'sell' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               {/* Inventory Grid */}
               <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {myInventory.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
                      No sellable assets found.
                    </div>
                  ) : (
                    myInventory.map((nft) => {
                       const tokenId = BigInt(nft.id.tokenId).toString();
                       const isSelected = selectedSellId === tokenId;
                       return (
                         <div 
                           key={tokenId} 
                           onClick={() => setSelectedSellId(tokenId)}
                           className={`aspect-square bg-[#12141a] rounded-xl overflow-hidden border cursor-pointer relative transition-all ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-white/10 hover:border-white/30'}`}
                         >
                           <img src={nft.media?.[0]?.gateway || '/kiki.png'} className="w-full h-full object-cover" />
                           
                           {/* ✅ LIVE 标记 */}
                           {nft.isPendingIndexer && (
                             <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 z-20 shadow-lg">
                               <AlertCircle className="w-2 h-2" /> LIVE
                             </div>
                           )}

                           <div className="absolute bottom-0 inset-x-0 p-2 bg-black/60 backdrop-blur-sm text-center">
                             <span className="text-xs font-bold text-white">#{tokenId}</span>
                           </div>
                           {isSelected && <div className="absolute top-2 right-2 text-indigo-500 bg-black rounded-full"><CheckCircle2 className="w-5 h-5 fill-current"/></div>}
                         </div>
                       )
                    })
                  )}
               </div>

               {/* Sell Form */}
               <div className="lg:col-span-4">
                  <div className="bg-[#12141a] border border-white/10 rounded-2xl p-6 sticky top-24 shadow-2xl">
                     <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                       <Tag className="w-5 h-5 text-indigo-500" /> Create Listing
                     </h3>
                     
                     {!selectedSellId ? (
                       <div className="py-10 text-center text-slate-500 border border-dashed border-white/10 rounded-xl mb-4 bg-white/5">
                          Select an item from left
                       </div>
                     ) : (
                       <div className="flex items-center gap-4 mb-6 p-3 bg-white/5 rounded-xl border border-white/5">
                          <img src={getSelectedSellImage()} className="w-12 h-12 rounded bg-black object-cover" />
                          <div>
                             <div className="text-xs text-slate-500 uppercase">Selling</div>
                             <div className="font-bold text-white">Token #{selectedSellId}</div>
                             {myInventory.find(n => BigInt(n.id.tokenId).toString() === selectedSellId)?.isPendingIndexer && (
                               <div className="text-[8px] text-yellow-400 flex items-center gap-1 mt-1"><AlertCircle className="w-2 h-2"/> LIVE DATA</div>
                             )}
                          </div>
                       </div>
                     )}

                     <div className="space-y-4">
                        <div>
                          <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Price (KIKI)</label>
                          <Input 
                            type="number" 
                            placeholder="e.g. 500" 
                            value={sellPrice}
                            onChange={e => setSellPrice(e.target.value)}
                            className="bg-black/20 border-white/10 text-white h-12 text-lg font-mono focus:border-indigo-500/50"
                          />
                        </div>
                        
                        <div className="text-xs text-slate-500 flex justify-between">
                          <span>Service Fee</span>
                          <span>0%</span>
                        </div>

                        <Button 
                          onClick={openListModal} 
                          disabled={!selectedSellId || !sellPrice || loading}
                          className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-900/20"
                        >
                          Review Listing
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* TAB 3: MY LISTINGS */}
          {activeTab === 'mine' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {myListings.length === 0 ? (
                 <div className="col-span-full py-20 text-center text-slate-500 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                   You have no active listings. Go to "Sell" tab to list assets.
                 </div>
              ) : (
                 myListings.map(item => (
                   <motion.div 
                     key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                     className="bg-[#12141a] border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/30 transition-all group relative"
                   >
                     {/* 遮罩：Hover 时显示 Cancel */}
                     <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                        <Button 
                          onClick={() => setCancelModal({ isOpen: true, item })} 
                          disabled={processing}
                          variant="destructive"
                          className="font-bold shadow-xl"
                        >
                          <Trash2 className="w-4 h-4 mr-2"/>
                          Cancel Listing
                        </Button>
                     </div>

                     <div className="aspect-square bg-black relative">
                       <img src={item.image} className="w-full h-full object-cover opacity-60" />
                       <div className="absolute top-2 left-2 bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold shadow-lg">ACTIVE</div>
                     </div>
                     <div className="p-4">
                       <div className="flex justify-between items-center mb-2">
                         <div className="font-bold text-white">Token #{item.token_id}</div>
                       </div>
                       <div className="flex items-center justify-between text-slate-400 text-sm">
                         <span>Listed Price</span>
                         <div className="flex items-center gap-1 text-white font-mono font-bold">
                           <Coins className="w-3 h-3 text-yellow-500" /> {item.price}
                         </div>
                       </div>
                     </div>
                   </motion.div>
                 ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}