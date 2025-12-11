'use client';

import { useAccount, useBalance } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wallet, CreditCard, Network } from 'lucide-react';

export default function Dashboard() {
  const { address, isConnected, chain } = useAccount();
  
  // 获取用户余额
  const { data: balance, isLoading } = useBalance({
    address: address,
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">请先连接钱包</h1>
          <p className="text-gray-400">你需要连接钱包才能查看仪表盘数据。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
          我的控制台
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. 钱包地址卡片 */}
          <Card className="bg-slate-900/50 border-slate-800 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">钱包地址</CardTitle>
              <Wallet className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
              <p className="text-xs text-gray-500 mt-1">当前连接账户</p>
            </CardContent>
          </Card>

          {/* 2. 余额卡片 */}
          <Card className="bg-slate-900/50 border-slate-800 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">原生代币余额</CardTitle>
              <CreditCard className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  `${parseFloat(balance?.formatted || '0').toFixed(4)} ${balance?.symbol}`
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">无需刷新，自动更新</p>
            </CardContent>
          </Card>

          {/* 3. 网络卡片 */}
          <Card className="bg-slate-900/50 border-slate-800 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">当前网络</CardTitle>
              <Network className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {chain?.name || '未知网络'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Chain ID: {chain?.id}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}