'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Zap, Cpu, Activity, Loader2, TestTube2, ArrowUpCircle, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logActivity } from '@/lib/logger'; 

const NFT_CONTRACT = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 
const TOKEN_CONTRACT = '0x83F7A90486697B8B881319FbADaabF337fE2c60c'; 
const TREASURY_ADDRESS = '0x0752bddacb7b73e26a45e2b16cdea53311f46f7c'; 

const tokenAbi = [
  { inputs: [{name: "to", type: "address"}, {name: "amount", type: "uint256"}], name: "transfer", outputs: [{type: "bool"}], stateMutability: "nonpayable", type: "function" }
] as const;

interface NFT {
  id: { tokenId: string };
  title: string;
  media: { gateway: string }[];
  level?: number; 
}

export default function ClinicSection() {
  const { address, isConnected, chain } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  const currentLevel = selectedNft?.level || 1;
  const nextLevel = currentLevel + 1;
  const upgradeCost = currentLevel * 20; 

  const fetchInventory = async () => {
    if (!address) return;
    setLoadingNfts(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      const network = chain?.id === 1 ? 'eth-mainnet' : 'eth-sepolia';
      const [alchemyRes, levelsRes] = await Promise.all([
         fetch(`https://${network}.g.alchemy.com/nft/v2/${apiKey}/getNFTs?owner=${address}&contractAddresses[]=${NFT_CONTRACT}&withMetadata=true`),
         supabase.from('nft_levels').select('*')
      ]);
      const data = await alchemyRes.json();
      const levels = levelsRes.data || [];
      const levelMap = new Map();
      levels.forEach((l: any) => levelMap.set(l.token_id, l.level));

      const myNfts = (data.ownedNfts || []).map((nft: any) => {
        const tokenIdDec = BigInt(nft.id.tokenId).toString();
        return { ...nft, level: levelMap.get(tokenIdDec) || 1 };
      }).sort((a: NFT, b: NFT) => (b.level || 1) - (a.level || 1));
      
      setNfts(myNfts);
      if (selectedNft) {
        const updated = myNfts.find((n: NFT) => n.id.tokenId === selectedNft.id.tokenId);
        if (updated) setSelectedNft(updated);
      }
    } catch (err) { console.error(err); } finally { setLoadingNfts(false); }
  };

  useEffect(() => { if (isConnected) fetchInventory(); }, [isConnected, address]);

  const { data: hash, writeContract, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    const updateDb = async () => {
      if (isSuccess && selectedNft && isUpgrading) {
        const tokenIdDec = BigInt(selectedNft.id.tokenId).toString();
        const { error } = await supabase.from('nft_levels').upsert({ token_id: tokenIdDec, level: nextLevel, updated_at: new Date().toISOString() }, { onConflict: 'token_id' });
        if (!error) {
          await logActivity({ address: address as string, type: 'MINT', details: `Upgraded Token #${tokenIdDec} to Lv.${nextLevel}`, hash });
          await fetchInventory(); 
          setTimeout(() => { reset(); setIsUpgrading(false); }, 2000); 
        }
      }
    };
    updateDb();
  }, [isSuccess]);

  const handleUpgrade = () => {
    if (!selectedNft || !address) return;
    setIsUpgrading(true);
    writeContract({ address: TOKEN_CONTRACT, abi: tokenAbi, functionName: 'transfer', args: [TREASURY_ADDRESS as `0x${string}`, parseEther(upgradeCost.toString())] });
  };

  return (
    <div className="relative p-1">
      <div className="flex items-center gap-4 mb-8">
         <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20"><TestTube2 className="w-8 h-8 text-purple-500" /></div>
         <div><h2 className="text-3xl font-bold text-white">Cyber Clinic</h2><p className="text-slate-400">Upgrade NFT levels</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-sm font-bold text-slate-400">Select Subject</h3><span className="text-xs text-slate-500">{nfts.length} AVAILABLE</span></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {loadingNfts ? <div className="col-span-full py-10 flex justify-center"><Loader2 className="animate-spin text-purple-500"/></div> : 
               nfts.map((nft) => {
                  const isSelected = selectedNft?.id.tokenId === nft.id.tokenId;
                  return (
                    <motion.div key={nft.id.tokenId} whileHover={{ scale: 1.02 }} onClick={() => !isUpgrading && setSelectedNft(nft)} className={`relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer border transition-all ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-white/5 hover:border-white/20'}`}>
                      <img src={nft.media?.[0]?.gateway || '/kiki.png'} className={`w-full h-full object-cover transition-all ${isSelected ? 'opacity-100' : 'opacity-60'}`} />
                      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 to-transparent"><div className="flex justify-between items-end"><div className="text-[10px] text-slate-400 font-mono">#{BigInt(nft.id.tokenId).toString()}</div><div className="text-sm font-bold text-white">Lv. {nft.level}</div></div></div>
                    </motion.div>
                  )
               })
              }
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-[#0e1015] border border-white/10 rounded-3xl p-8 shadow-2xl relative min-h-[400px] flex flex-col">
               {!selectedNft ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50"><Zap className="w-16 h-16 stroke-1" /><p className="text-sm">Select asset to upgrade</p></div>
               ) : (
                  <>
                    <div className="flex items-center justify-between mb-8">
                       <h2 className="text-2xl font-bold text-white">v{nextLevel}.0 <span className="text-purple-500 text-sm">Modification</span></h2>
                       <Activity className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="space-y-6 flex-1">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 p-4 rounded-xl border border-white/5"><div className="text-xs text-slate-500">Current</div><div className="text-2xl font-bold text-slate-300">Lv.{currentLevel}</div></div>
                          <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-500/30"><div className="text-xs text-purple-300 flex items-center gap-1">Target <ArrowUpCircle className="w-3 h-3"/></div><div className="text-2xl font-bold text-white">Lv.{nextLevel}</div></div>
                       </div>
                       <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                          <div className="flex items-center gap-3"><Wallet className="w-5 h-5 text-yellow-500" /><span className="text-xs font-bold text-slate-400 uppercase">Cost</span></div>
                          <div className="text-xl font-bold text-white">{upgradeCost} KIKI</div>
                       </div>
                    </div>
                    <div className="mt-8">
                       <AnimatePresence mode="wait">
                          {isSuccess && !isUpgrading ? (
                             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full h-14 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center text-green-400 font-bold">SUCCESS</motion.div>
                          ) : (
                             <Button onClick={handleUpgrade} disabled={isPending || isConfirming || isUpgrading} className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-xl">
                                {isPending || isConfirming ? <Loader2 className="animate-spin mr-2"/> : "INITIATE UPGRADE"}
                             </Button>
                          )}
                       </AnimatePresence>
                    </div>
                  </>
               )}
            </div>
          </div>
      </div>
    </div>
  );
}