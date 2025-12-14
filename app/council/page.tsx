'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useSignMessage } from 'wagmi';
import { formatEther } from 'viem';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Scale, Vote, CheckCircle2, XCircle, 
  Loader2, Clock, FileText, Lock, X, Award
} from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import TokenBalance from '@/components/TokenBalance';

// --- 配置 ---
const NFT_CONTRACT = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 
const TOKEN_CONTRACT = '0x83F7A90486697B8B881319FbADaabF337fE2c60c'; 

// ABI
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

export default function CouncilPage() {
  const { address, isConnected } = useAccount();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [hasVotedMap, setHasVotedMap] = useState<Record<number, boolean>>({});

  // ✅ 新增：投票结果弹窗状态
  const [voteResult, setVoteResult] = useState<{ 
    isOpen: boolean; 
    proposalId: number; 
    choice: 'yes' | 'no'; 
    power: string 
  } | null>(null);

  // --- 1. 获取权重 (Voting Power) ---
  const { data: tokenBal } = useReadContract({
    address: TOKEN_CONTRACT, abi: readAbi, functionName: 'balanceOf', args: address ? [address] : undefined
  });
  const { data: nftBal } = useReadContract({
    address: NFT_CONTRACT, abi: readAbi, functionName: 'balanceOf', args: address ? [address] : undefined
  });

  const votingPower = (
    Number(formatEther(tokenBal || 0n)) + 
    Number(nftBal || 0n) * 1000
  ).toFixed(0);

  // --- 2. 获取数据 ---
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
        votes?.filter(v => v.wallet_address.toLowerCase() === address.toLowerCase())
              .forEach(v => myMap[v.proposal_id] = true);
        setHasVotedMap(myMap);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [address]);

  // --- 3. 投票逻辑 ---
  const { signMessageAsync } = useSignMessage();

  const handleVote = async (proposalId: number, choice: 'yes' | 'no') => {
    if (!address || Number(votingPower) <= 0) return alert("You need voting power (KIKI or NFT) to vote.");
    
    setVotingId(proposalId);
    try {
      const message = `Vote for Proposal #${proposalId}\nChoice: ${choice.toUpperCase()}\nPower: ${votingPower}\nAddress: ${address}`;
      await signMessageAsync({ message });

      const { error } = await supabase.from('votes').insert([{
        proposal_id: proposalId,
        wallet_address: address,
        voting_power: votingPower,
        choice: choice
      }]);

      if (error) throw error;

      // ✅ 替换 Alert：打开弹窗
      setVoteResult({ 
        isOpen: true, 
        proposalId, 
        choice, 
        power: votingPower 
      });
      
      fetchData();

    } catch (e: any) {
      console.error(e);
      // 错误还是可以用简单提示，或者不做处理（用户取消签名）
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-200 font-sans selection:bg-yellow-500/30">
      
      {/* 📜 1. 投票成功弹窗 (The Receipt) */}
      <AnimatePresence>
        {voteResult?.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, rotateX: 10 }} 
              animate={{ scale: 1, y: 0, rotateX: 0 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#161A1E] border border-yellow-500/30 w-full max-w-sm rounded-xl overflow-hidden shadow-[0_0_60px_rgba(234,179,8,0.15)] relative"
            >
              {/* 顶部金色条纹 */}
              <div className="h-1.5 w-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600"></div>
              
              <div className="p-8 text-center relative">
                {/* 关闭按钮 */}
                <button onClick={() => setVoteResult(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>

                {/* 图标 */}
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/20">
                  <Award className="w-10 h-10 text-yellow-500" strokeWidth={2} />
                </div>

                <h3 className="text-2xl font-bold text-white mb-1 font-serif tracking-wide">Vote Cast</h3>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-8">On-Chain Governance</p>

                {/* 票据详情 */}
                <div className="bg-[#0B0C10] border border-white/5 rounded-lg p-4 space-y-3 mb-8 text-left relative overflow-hidden">
                   {/* 纸张纹理 */}
                   <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                   
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Proposal ID</span>
                      <span className="font-mono font-bold text-white">#{voteResult.proposalId}</span>
                   </div>
                   <div className="h-px bg-white/5"></div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Your Choice</span>
                      <span className={`font-bold uppercase px-2 py-0.5 rounded text-xs ${voteResult.choice === 'yes' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {voteResult.choice}
                      </span>
                   </div>
                   <div className="h-px bg-white/5"></div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Voting Power</span>
                      <span className="font-mono font-bold text-yellow-400">{Number(voteResult.power).toLocaleString()} VP</span>
                   </div>
                </div>

                <Button 
                  onClick={() => setVoteResult(null)} 
                  className="w-full h-12 bg-white text-black hover:bg-slate-200 font-bold rounded-lg tracking-wide uppercase"
                >
                  Close Receipt
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-yellow-900/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div className="flex flex-col gap-1">
            <Link href="/dashboard" className="inline-flex items-center text-xs font-mono text-slate-500 hover:text-white transition-colors mb-2 uppercase tracking-wide">
              <ArrowLeft className="mr-2 h-3 w-3" /> Return to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <Scale className="w-10 h-10 text-yellow-500" />
              The Council
            </h1>
            <p className="text-slate-400 text-sm">Decentralized Governance. 1 KIKI = 1 Vote. 1 NFT = 1000 Votes.</p>
          </div>
          <div className="flex items-center gap-4">
            {isConnected && (
               <div className="hidden md:flex flex-col items-end mr-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Your Voting Power</span>
                  <span className="text-xl font-mono font-bold text-yellow-400">{Number(votingPower).toLocaleString()} VP</span>
               </div>
            )}
            <ConnectButton />
          </div>
        </header>

        {/* Proposals List */}
        <div className="space-y-8">
          {loading ? (
             <div className="py-20 text-center flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500"/>
                <span className="text-slate-500 font-mono text-sm">SYNCING GOVERNANCE NODES...</span>
             </div>
          ) : proposals.length === 0 ? (
             <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3"/>
                <p className="text-slate-500">No active proposals.</p>
             </div>
          ) : (
             proposals.map(proposal => {
               const total = proposal.total_power || 0;
               const yesPercent = total > 0 ? (proposal.yes_votes! / total) * 100 : 0;
               const noPercent = total > 0 ? (proposal.no_votes! / total) * 100 : 0;
               const hasVoted = hasVotedMap[proposal.id];
               const isExpired = new Date(proposal.end_at) < new Date();

               return (
                 <motion.div 
                   key={proposal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                   className="bg-[#12141a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative group"
                 >
                   <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                   
                   {/* 状态标 */}
                   <div className="absolute top-6 right-6">
                      {isExpired ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full text-xs font-bold text-slate-400 border border-slate-700">
                           <Lock className="w-3 h-3"/> CLOSED
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full text-xs font-bold text-green-400 border border-green-500/20 animate-pulse">
                           <Clock className="w-3 h-3"/> ACTIVE
                        </div>
                      )}
                   </div>

                   <div className="p-8">
                      <div className="flex items-center gap-3 text-slate-500 text-xs font-mono mb-2">
                         <span className="bg-white/5 px-2 py-1 rounded">KIP-{String(proposal.id).padStart(3, '0')}</span>
                         <span>Ends {new Date(proposal.end_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">{proposal.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-3xl mb-8 border-l-2 border-white/5 pl-4">
                        {proposal.description}
                      </p>

                      {/* 投票条 */}
                      <div className="space-y-4 mb-8">
                         <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                               <span className="text-green-400 flex items-center gap-2"><CheckCircle2 className="w-3 h-3"/> For ({yesPercent.toFixed(1)}%)</span>
                               <span className="text-slate-500">{Number(proposal.yes_votes).toLocaleString()} VP</span>
                            </div>
                            <Progress value={yesPercent} className="h-2 bg-slate-800" />
                         </div>
                         <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                               <span className="text-red-400 flex items-center gap-2"><XCircle className="w-3 h-3"/> Against ({noPercent.toFixed(1)}%)</span>
                               <span className="text-slate-500">{Number(proposal.no_votes).toLocaleString()} VP</span>
                            </div>
                            <Progress value={noPercent} className="h-2 bg-slate-800" /> 
                         </div>
                      </div>

                      {/* 投票按钮 */}
                      <div className="flex gap-4 border-t border-white/5 pt-6">
                         {hasVoted ? (
                            <div className="w-full py-3 text-center bg-white/5 rounded-xl border border-white/5 text-slate-400 font-mono text-sm flex items-center justify-center gap-2">
                               <CheckCircle2 className="w-4 h-4 text-green-500"/> You have voted
                            </div>
                         ) : !isConnected ? (
                            <div className="w-full text-center text-slate-500 text-sm">Connect wallet to vote</div>
                         ) : isExpired ? (
                            <div className="w-full text-center text-slate-500 text-sm">Proposal Ended</div>
                         ) : (
                            <>
                              <Button 
                                onClick={() => handleVote(proposal.id, 'yes')}
                                disabled={votingId === proposal.id}
                                className="flex-1 bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-600/50 h-12 font-bold text-lg"
                              >
                                {votingId === proposal.id ? <Loader2 className="w-5 h-5 animate-spin"/> : "VOTE FOR"}
                              </Button>
                              <Button 
                                onClick={() => handleVote(proposal.id, 'no')}
                                disabled={votingId === proposal.id}
                                className="flex-1 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/50 h-12 font-bold text-lg"
                              >
                                {votingId === proposal.id ? <Loader2 className="w-5 h-5 animate-spin"/> : "VOTE AGAINST"}
                              </Button>
                            </>
                         )}
                      </div>
                   </div>
                 </motion.div>
               )
             })
          )}
        </div>

      </div>
    </div>
  );
}