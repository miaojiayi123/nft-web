// src/components/RealTimeNftListener.tsx

'use client';

import { useAccount, useWatchContractEvent } from 'wagmi';
import { EventEmitter } from 'events';
import { useEffect } from 'react';

// 🔥 全局事件发射器，用于跨组件通信
export const DataRefreshEmitter = new EventEmitter();

const NFT_CONTRACT = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 

// ERC-721 Transfer(address, address, uint256) ABI
const transferEventAbi = [{
    name: 'Transfer',
    type: 'event',
    inputs: [
        { indexed: true, name: 'from', type: 'address' },
        { indexed: true, name: 'to', type: 'address' },
        { indexed: true, name: 'tokenId', type: 'uint256' },
    ],
}] as const;

export default function RealTimeNftListener() {
  const { address } = useAccount();

  useWatchContractEvent({
    address: NFT_CONTRACT as `0x${string}`,
    abi: transferEventAbi,
    eventName: 'Transfer',
    
    // 🔔 核心优化：只监听 Mint 给当前用户地址的事件
    args: {
        to: address as `0x${string}` 
    },
    
    onLogs(logs) {
      if (logs.length > 0) {
        const tokenId = logs[0].args.tokenId?.toString();
        console.log(`[REALTIME] 监听到新的 NFT #${tokenId} 入账，触发全局刷新...`);
        
        // 🔥 触发全局刷新事件
        DataRefreshEmitter.emit('nft-update', tokenId); 
      }
    },
  });

  return null; 
}