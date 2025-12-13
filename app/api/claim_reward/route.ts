import { NextResponse } from 'next/server';
import { createWalletClient, http, parseEther, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

// KIKI 代币合约地址
const TOKEN_CONTRACT_ADDRESS = '0x83F7A90486697B8B881319FbADaabF337fE2c60c';

// 仅包含 mint 函数的 ABI
const tokenAbi = [
  {
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export async function POST(request: Request) {
  try {
    const { address, amount } = await request.json();

    if (!address || !amount) {
      return NextResponse.json({ error: 'Missing address or amount' }, { status: 400 });
    }

    // 1. 获取管理员账户
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: 'Server misconfiguration: No private key' }, { status: 500 });
    }

    const account = privateKeyToAccount(`0x${privateKey}`);

    // 2. 初始化 Viem 客户端 (用于发送交易)
    const client = createWalletClient({
      account,
      chain: sepolia,
      transport: http() // 使用默认的 RPC 节点
    });

    // 3. 转换金额 (前端传过来的是字符串 "0.0004", 转为 BigInt Wei)
    // 注意：这里要做防呆处理，防止过大金额
    const amountInWei = parseEther(amount.toString());

    console.log(`[API] Minting ${amount} KIKI to ${address}...`);

    // 4. 调用合约 mint 方法
    const hash = await client.writeContract({
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'mint',
      args: [address, amountInWei],
    });

    console.log(`[API] Transaction sent: ${hash}`);

    // 5. 返回交易哈希
    return NextResponse.json({ success: true, txHash: hash });

  } catch (error: any) {
    console.error("[API Error]", error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}