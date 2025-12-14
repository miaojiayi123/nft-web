// app/api/faucet/route.js

import { NextResponse } from 'next/server';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, mainnet } from 'viem/chains'; // 根据你的网络选择
import { supabase } from '@/lib/supabaseClient';

const TOKEN_CONTRACT_ADDRESS = '0x83F7A90486697B8B881319FbADaabF337fE2c60c';
const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000;

// ABI
const tokenAbi = [
  {
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export async function POST(req) {
  try {
    const { address } = await req.json();
    if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 });

    // 1. 服务端再次检查冷却时间 (安全校验)
    const { data: claimData } = await supabase
      .from('faucet_claims')
      .select('last_claimed_at')
      .eq('wallet_address', address)
      .single();

    if (claimData) {
      const lastClaimed = new Date(claimData.last_claimed_at).getTime();
      if (Date.now() - lastClaimed < COOLDOWN_PERIOD) {
        return NextResponse.json({ error: 'Cooldown active' }, { status: 429 });
      }
    }

    // 2. 配置管理员钱包 (Minters)
    let privateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!privateKey) throw new Error("ADMIN_PRIVATE_KEY not set in environment.");

    // 🔥 修复：清理私钥格式，确保它以 0x 开头
    // 移除空白字符
    privateKey = privateKey.trim();
    // 确保有 0x 前缀
    if (!privateKey.startsWith('0x')) {
      privateKey = `0x${privateKey}`;
    }
    
    // ⚠️ 最终检查私钥长度，确保是 66 个字符 (0x + 64 hex digits)
    if (privateKey.length !== 66) {
        throw new Error(`Invalid private key length: expected 66 (0x + 64 chars), got ${privateKey.length}`);
    }

    const account = privateKeyToAccount(privateKey);
    
    // 假设使用 Sepolia 网络
    const client = createWalletClient({
      account,
      chain: sepolia, 
      transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL)
    });

    // 3. 执行铸造 (100 Tokens)
    const amount = parseEther('100');
    
    const hash = await client.writeContract({
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'mint',
      args: [address, amount]
    });

    // 4. 更新数据库记录 
    await supabase.from('faucet_claims').upsert(
      { wallet_address: address, last_claimed_at: new Date().toISOString() },
      { onConflict: 'wallet_address' }
    );

    return NextResponse.json({ success: true, txHash: hash });

  } catch (error) {
    console.error("Faucet error:", error);
    // 区分私钥错误和其他错误
    const errorMsg = error.message.includes('private key') ? 'Configuration Error: Invalid ADMIN_PRIVATE_KEY format.' : 'Mint failed. Check server logs.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}