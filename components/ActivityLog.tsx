'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabaseClient';
import { SpotlightCard } from '@/components/ui/spotlight-card'; // 复用你的聚光灯卡片
import { CardContent } from '@/components/ui/card';
import { ExternalLink, Rocket, Zap, Gift, Send, History, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns'; // 建议安装: npm install date-fns

// 如果不想安装 date-fns，可以用简单的 JS 函数代替，下面我会写一个简单的 formatDate

interface LogItem {
  id: number;
  action_type: string;
  details: string;
  tx_hash: string;
  created_at: string;
}

export default function ActivityLog() {
  const { address } = useAccount();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!address) return;
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('wallet_address', address)
        .order('created_at', { ascending: false }) // 最新在前
        .limit(10); // 只显示最近10条

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchLogs();
    
    // 简单的轮询机制，保持数据新鲜 (或者用 Supabase 实时订阅)
    const interval = setInterval(fetchLogs, 5000); 
    return () => clearInterval(interval);
  }, [address]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'MINT': return <Rocket className="w-4 h-4 text-blue-400" />;
      case 'STAKE': return <Zap className="w-4 h-4 text-green-400" />;
      case 'CLAIM': return <Gift className="w-4 h-4 text-yellow-400" />;
      case 'TRANSFER': return <Send className="w-4 h-4 text-purple-400" />;
      default: return <History className="w-4 h-4 text-slate-400" />;
    }
  };

  // 简单的相对时间格式化
  const timeAgo = (dateStr: string) => {
    const diff = (new Date().getTime() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (!address) return null;

  return (
    <SpotlightCard className="h-full" spotlightColor="rgba(255, 255, 255, 0.1)">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-slate-500" />
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Recent Activity</span>
          </div>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-slate-600" />}
        </div>

        <div className="space-y-1">
          {logs.length === 0 && !loading ? (
            <div className="text-center py-8 text-slate-600 text-sm font-mono">NO TRANSACTIONS FOUND</div>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id} 
                className="group flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full bg-white/5 border border-white/5 group-hover:scale-110 transition-transform duration-300`}>
                    {getIcon(log.action_type)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white uppercase tracking-wide">
                      {log.action_type}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {log.details}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-600 font-mono">
                    {timeAgo(log.created_at)}
                  </span>
                  {log.tx_hash && (
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${log.tx_hash}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-400 hover:underline"
                    >
                      View on Scan <ExternalLink className="w-2 h-2" />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </SpotlightCard>
  );
}