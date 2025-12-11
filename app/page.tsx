'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// 你的合约地址
const CONTRACT_ADDRESS = "0x54675C899d8864Bfd0060E713303534B717D6d81";

// 你的图片地址
const IMAGE_URL = "https://ipfs.io/ipfs/bafybeic4qc7uvto4ekccbf5weephy33ronqajnlul3tbm3pu3naiezanha";

// ⬇️⬇️⬇️ 修改了这里：把 name 改成了 nextTokenId
const ABI = [
  {
    "inputs": [],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextTokenId", // 这里改了！
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export default function Home() {
  // ⬇️⬇️⬇️ 修改了这里：读取 nextTokenId
  const { data: nextTokenId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'nextTokenId',
  });

  // 计算：实际数量 = 下一个ID - 1
  // 如果读不到数据(undefined)，就显示 0
  const mintedCount = nextTokenId ? (Number(nextTokenId) - 1).toString() : 'Loading...';

  const { data: hash, writeContract, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: '20px', color: '#333' }}>
      
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '20px' }}>
        我的 Web3 NFT 发行站
      </h1>

      <div style={{ marginBottom: '30px' }}>
        <ConnectButton />
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        
        <img 
          src={IMAGE_URL} 
          alt="NFT" 
          style={{ width: '100%', borderRadius: '10px', marginBottom: '15px' }}
        />

        {/* ⬇️⬇️⬇️ 修改了这里：显示计算后的 mintedCount */}
        <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
          已铸造数量: <strong>{mintedCount}</strong>
        </p>

        <button 
          onClick={() => writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'mint' })}
          disabled={isPending || isConfirming}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: '10px',
            border: 'none',
            background: isSuccess ? '#4caf50' : '#2196f3',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: (isPending || isConfirming) ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? '请在钱包确认...' : isConfirming ? '正在上链...' : isSuccess ? '铸造成功！' : '免费铸造 (Mint)'}
        </button>

        {hash && (
          <div style={{ marginTop: '15px', fontSize: '0.9rem' }}>
            <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" style={{ color: '#2196f3' }}>
              查看交易详情 ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}