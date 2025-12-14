'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useSignMessage } from 'wagmi';
import { formatEther } from 'viem';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Scale, CheckCircle2, XCircle, Loader2, Clock, FileText, Lock, X, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 配置 ---
const NFT_CONTRACT = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 
const TOKEN_CONTRACT = '0x83F7A90486697B8B881319FbADaabF337fE2c60c'; 

const readAbi = [
  { inputs: [{name: "account", type: "address"}], name: "balanceOf", outputs: [{name: "", type: "uint256"}], stateMutability: "view", type: "function" }
] as const;

interface Proposal {
  id: number;
  title: string;
  description: string;
  status: string;
  end_at: string;
  yes_votes?: number; 
  no_votes?: number;  
  total_power?: number;
}

export default function CouncilSection() {
  const { address, isConnected } = useAccount();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [hasVotedMap, setHasVotedMap] = useState<Record<number, boolean>>({});
  const [voteResult, setVoteResult] = useState<{ isOpen: boolean; proposalId: number; choice: 'yes' | 'no'; power: string } | null>(null);

  // 1. 获取权重
  const { data: tokenBal } = useReadContract({ address: TOKEN_CONTRACT, abi: readAbi, functionName: 'balanceOf', args: address ? [address] : undefined });
  const { data: nftBal } = useReadContract({ address: NFT_CONTRACT, abi: readAbi, functionName: 'balanceOf', args: address ? [address] : undefined });

  const votingPower = (Number(formatEther(tokenBal || 0n)) + Number(nftBal || 0n) * 1000).toFixed(0);

  // 2. 获取数据
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: props } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
      const { data: votes } = await supabase.from('votes').select('*');

      const processed = props?.map(p => {
        const pVotes = votes?.filter(v => v.proposal_id === p.id) || [];
        const yes = pVotes.filter(v => v.choice === 'yes').reduce((acc, v) => acc + Number(v.voting_power), 0);
        const no = pVotes.filter(v => v.choice === 'no').reduce((acc, v) => acc + Number(v.voting_power), 0);
        return { ...p, yes_votes: yes, no_votes: no, total_power: yes + no };
      });
      setProposals(processed || []);

      if (address) {
        const myMap: Record<number, boolean> = {};
        votes?.filter(v => v.wallet_address.toLowerCase() === address.toLowerCase()).forEach(v => myMap[v.proposal_id] = true);
        setHasVotedMap(myMap);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [address]);

  // 3. 投票逻辑
  const { signMessageAsync } = useSignMessage();
  const handleVote = async (proposalId: number, choice: 'yes' | 'no') => {
    if (!address || Number(votingPower) <= 0) return alert("Insufficient VP");
    setVotingId(proposalId);
    try {
      await signMessageAsync({ message: `Vote #${proposalId}\nChoice: ${choice}\nPower: ${votingPower}` });
      await supabase.from('votes').insert([{ proposal_id: proposalId, wallet_address: address, voting_power: votingPower, choice }]);
      setVoteResult({ isOpen: true, proposalId, choice, power: votingPower });
      fetchData();
    } catch (e) { console.error(e); } finally { setVotingId(null); }
  };

  return (
    <div className="relative p-1">
      {/* 弹窗 */}
      <AnimatePresence>
        {voteResult?.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
             <div className="bg-[#161A1E] border border-yellow-500/30 p-8 rounded-xl text-center w-full max-w-sm">
                <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4"/>
                <h3 className="text-xl font-bold text-white mb-2">Vote Cast</h3>
                <div className="text-yellow-400 font-mono font-bold text-lg mb-6">{Number(voteResult.power).toLocaleString()} VP</div>
                <Button onClick={() => setVoteResult(null)} className="w-full bg-white text-black">Close</Button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4 mb-8">
         <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
            <Scale className="w-8 h-8 text-yellow-500" />
         </div>
         <div>
            <h2 className="text-3xl font-bold text-white">The Council</h2>
            <p className="text-slate-400">Decentralized Governance</p>
         </div>
         <div className="ml-auto text-right hidden md:block">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Your Power</div>
            <div className="text-xl font-mono font-bold text-yellow-400">{Number(votingPower).toLocaleString()} VP</div>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
         {loading ? <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-yellow-500"/></div> : 
          proposals.length === 0 ? <div className="text-center py-10 text-slate-500 border border-dashed border-white/10 rounded-xl">No active proposals</div> :
          proposals.map(proposal => {
             const total = proposal.total_power || 0;
             const yesPct = total > 0 ? (proposal.yes_votes! / total) * 100 : 0;
             const noPct = total > 0 ? (proposal.no_votes! / total) * 100 : 0;
             return (
               <div key={proposal.id} className="bg-[#12141a] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-yellow-500/30 transition-all">
                  <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                  <div className="flex justify-between items-start mb-4">
                     <h3 className="text-xl font-bold text-white">{proposal.title}</h3>
                     <span className="bg-white/5 px-2 py-1 rounded text-xs text-slate-400 font-mono">KIP-{proposal.id}</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-6">{proposal.description}</p>
                  
                  <div className="space-y-3 mb-6">
                     <div className="flex justify-between text-xs text-green-400 font-bold"><span>FOR</span><span>{yesPct.toFixed(1)}%</span></div>
                     <Progress value={yesPct} className="h-1.5 bg-slate-800"/>
                     <div className="flex justify-between text-xs text-red-400 font-bold"><span>AGAINST</span><span>{noPct.toFixed(1)}%</span></div>
                     <Progress value={noPct} className="h-1.5 bg-slate-800"/>
                  </div>

                  <div className="flex gap-3">
                     <Button onClick={() => handleVote(proposal.id, 'yes')} disabled={!!votingId || hasVotedMap[proposal.id]} className="flex-1 bg-green-900/20 text-green-400 border border-green-900 hover:bg-green-900/40">VOTE FOR</Button>
                     <Button onClick={() => handleVote(proposal.id, 'no')} disabled={!!votingId || hasVotedMap[proposal.id]} className="flex-1 bg-red-900/20 text-red-400 border border-red-900 hover:bg-red-900/40">VOTE AGAINST</Button>
                  </div>
               </div>
             )
          })
         }
      </div>
    </div>
  );
}