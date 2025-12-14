export const tokenAbi = [
  // 查询余额
  { inputs: [{name: "account", type: "address"}], name: "balanceOf", outputs: [{name: "", type: "uint256"}], stateMutability: "view", type: "function" },
  // 授权 (Approve)
  { inputs: [{name: "spender", type: "address"}, {name: "amount", type: "uint256"}], name: "approve", outputs: [{type: "bool"}], stateMutability: "nonpayable", type: "function" },
  // 查询授权额度 (Allowance)
  { inputs: [{name: "owner", type: "address"}, {name: "spender", type: "address"}], name: "allowance", outputs: [{type: "uint256"}], stateMutability: "view", type: "function" },
  // 转账 (Transfer)
  { inputs: [{name: "to", type: "address"}, {name: "amount", type: "uint256"}], name: "transfer", outputs: [{type: "bool"}], stateMutability: "nonpayable", type: "function" },
  // 授权转账 (TransferFrom - 市场交易核心)
  { inputs: [{name: "from", type: "address"}, {name: "to", type: "address"}, {name: "amount", type: "uint256"}], name: "transferFrom", outputs: [{type: "bool"}], stateMutability: "nonpayable", type: "function" }
] as const;

export const nftAbi = [
  // 查询余额
  { inputs: [{name: "owner", type: "address"}], name: "balanceOf", outputs: [{name: "", type: "uint256"}], stateMutability: "view", type: "function" },
  // 查询所有者
  { inputs: [{name: "tokenId", type: "uint256"}], name: "ownerOf", outputs: [{name: "", type: "address"}], stateMutability: "view", type: "function" },
  // 授权单个 NFT
  { inputs: [{name: "to", type: "address"}, {name: "tokenId", type: "uint256"}], name: "approve", outputs: [], stateMutability: "nonpayable", type: "function" },
  // 授权所有 NFT (SetApprovalForAll - 市场交易核心)
  { inputs: [{name: "operator", type: "address"}, {name: "approved", type: "bool"}], name: "setApprovalForAll", outputs: [], stateMutability: "nonpayable", type: "function" },
  // 查询是否授权所有
  { inputs: [{name: "owner", type: "address"}, {name: "operator", type: "address"}], name: "isApprovedForAll", outputs: [{name: "", type: "bool"}], stateMutability: "view", type: "function" },
  // 转移 NFT (TransferFrom)
  { inputs: [{name: "from", type: "address"}, {name: "to", type: "address"}, {name: "tokenId", type: "uint256"}], name: "transferFrom", outputs: [], stateMutability: "nonpayable", type: "function" },
  // 铸造 (Mint)
  { inputs: [{ name: "to", type: "address" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" },
  // 总供应量
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }
] as const;