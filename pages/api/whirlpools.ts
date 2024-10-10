import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { buildDefaultAccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, WhirlpoolContext, PriceMath } from "@orca-so/whirlpools-sdk";
import { addExtraAccountMetasForExecute, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

type Token = { 
    mint: string;
    symbol: string;
    logoURI?: string;
  };
  
  const SOLANA_RPC_ENDPOINT = "https://rpc.ironforge.network/mainnet?apiKey=01HRZ9G6Z2A19FY8PR4RF4J4PW";
const JUPITER_API_URL = "https://quote-api.jup.ag";

type WhirlpoolInfo = {
  address: string;
  tokenA: any;
  tokenB: any;
  liquidity: string;
  tickSpacing: number;
  tvl: string;
  volume24h: number;
  hasTransferHook: boolean;
  token2022: boolean;
  price: string;
  tickIndex: number;
};

interface SwapRate {
  inputMint: string;
  outputMint: string;
  rate: number;
}

export type EdgeData = {
  isWhirlpool: boolean;
  poolAddress: string;
  tokenA: string;
  optional: boolean,
  tokenB: string;
  poolData?: any;
  price: number; // exchange rate from tokenA to tokenB
  liquidity: number;
  hasTransferHook: boolean;
};

export class TokenGraph {
  nodes: Set<string>;
  edges: Map<string, Map<string, EdgeData>>;

  constructor() {
    this.nodes = new Set();
    this.edges = new Map();
  }

  addEdge(tokenA: string, tokenB: string, data: EdgeData) {
    this.nodes.add(tokenA);
    this.nodes.add(tokenB);

    if (!this.edges.has(tokenA)) {
      this.edges.set(tokenA, new Map());
    }
    this.edges.get(tokenA)!.set(tokenB, data);
  }
}
export function buildTokenGraphFromPools(pools: any[]): TokenGraph {
  const graph = new TokenGraph();
  for (const pool of pools) {
    const tokenAMint = pool.tokenA.mint;
    const tokenBMint = pool.tokenB.mint;

    const priceAB = parseFloat(pool.price);
    const priceBA = 1 / priceAB;

    const edgeDataAB: EdgeData = {
      isWhirlpool: true,
      optional: pool.optional, // Include all pools
      poolData: pool,
      tokenA: tokenAMint,
      tokenB: tokenBMint,
      poolAddress: pool.address,
      price: priceAB,
      liquidity: parseFloat(pool.liquidity),
      hasTransferHook: pool.hasTransferHook,
    };

    const edgeDataBA: EdgeData = {
      isWhirlpool: true,
      optional: pool.optional, // Include all pools
      poolData: pool,
      tokenA: tokenBMint,
      tokenB: tokenAMint,
      poolAddress: pool.address,
      price: priceBA,
      liquidity: parseFloat(pool.liquidity),
      hasTransferHook: pool.hasTransferHook,
    };

    graph.addEdge(tokenAMint, tokenBMint, edgeDataAB);
    graph.addEdge(tokenBMint, tokenAMint, edgeDataBA);
  }

  return graph;
}
export function detectArbitrage(graph: TokenGraph): string[][] {
  console.log("Starting arbitrage detection");
  const arbitrageOpportunities: string[][] = [];
  const nodes = Array.from(graph.nodes);
  console.log(`Number of nodes: ${nodes.length}`);

  // USDC mint address
  const usdcMint = "GGo8ee2DkuX2oFminYuBphMwEiQ5BdCzyYd84Nnm24R5";

  // Only use USDC as the start and end node
  const startNode = usdcMint;
  console.log(`Analyzing start node: ${startNode}`);

  function dfs(currentNode: string, path: string[], visited: Set<string>, profit: number) {
    if (currentNode === startNode && path.length > 1) {
      // We've found a cycle back to USDC
      arbitrageOpportunities.push([...path, startNode]);
      return;
    }

    if (visited.has(currentNode)) {
      return;
    }
    if (path.length > 8){
      return;
    }

    visited.add(currentNode);
    path.push(currentNode);

    const edges = graph.edges.get(currentNode);
    if (edges) {
      for (const [nextNode, edgeData] of edges.entries()) {
        if (!edgeData.optional) {
          const newProfit = profit * edgeData.price;
          dfs(nextNode, path, new Set(visited), newProfit);
        }
      }
    }

    path.pop();
    visited.delete(currentNode);
  }

  dfs(startNode, [], new Set(), 1);
console.log(arbitrageOpportunities)
  console.log(`Total arbitrage opportunities found: ${arbitrageOpportunities.length}`);
  
  // Sort arbitrage opportunities by length (shortest first)
  arbitrageOpportunities.sort((a, b) => a.length - b.length);

  // Limit to top 10 opportunities
  return arbitrageOpportunities.slice(0, 10);
}

  const connection = new Connection("https://rpc.ironforge.network/mainnet?apiKey=01HRZ9G6Z2A19FY8PR4RF4J4PW", "confirmed");
  
  async function getExtraAccountMetasForHookProgram(
    provider: any,
    hookProgramId: PublicKey,
    source: PublicKey,
    mint: PublicKey,
    destination: PublicKey,
    owner: PublicKey,
    amount: number | bigint,
  ): Promise<any[] | undefined> {
    const instruction = new TransactionInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      keys: [
        { pubkey: source, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: destination, isSigner: false, isWritable: false },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: owner, isSigner: false, isWritable: false },
      ],
    });
  
    await addExtraAccountMetasForExecute(
      provider.connection,
      instruction,
      hookProgramId,
      source,
      mint,
      destination,
      owner,
      amount,
      "confirmed",
    );
  
    const extraAccountMetas = instruction.keys.slice(5);
    return extraAccountMetas.length > 0 ? extraAccountMetas : undefined;
  }
  const NodeCache = require('node-cache');
  const cache = new NodeCache({ stdTTL: 6000 }); // Cache for 10 minutes

  export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
      try {
        // Check if cached data exists
        const cachedPools = await cache.get('pools');
        const cachedArbitragePaths = await cache.get('arbitrage_paths');
  
        if (cachedPools && cachedArbitragePaths) {
          // If cached data exists, parse it before returning
          const responseData = {
            pools: JSON.parse(cachedPools),
            arbitragePaths: JSON.parse(cachedArbitragePaths),
          };
          res.status(200).json(responseData);
  
          // Queue a background job to refresh the cache
          setImmediate(async () => {
            await refreshCache();
          });
  
          return;
        }
  
        // If no cached data, process and return
        const responseData = await processAndCacheData();
        res.status(200).json(responseData);
  
  
      } catch (error: any) {
        console.error("Failed to fetch whirlpools:", error);
        res.status(500).json({ error: 'Failed to fetch whirlpools', details: error.message });
      }
    }
  }
  async function refreshCache() {
    try {
      const data = await processAndCacheData();
      console.log("Cache refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh cache:", error);
    }
  }

  async function processAndCacheData() {
    

    const now = Date.now();
    const whirlpoolExpiry = now + 15 * 60 * 1000; // 15 minutes
    const tokenExpiry = now + 60 * 60 * 1000; // 1 hour

    // Fetch and process whirlpools
    // @ts-ignore
    const provider = new AnchorProvider(connection);
    const fetcher = buildDefaultAccountFetcher(connection as any);
    // @ts-ignore
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID, fetcher);
    const client = buildWhirlpoolClient(ctx);
    // Fetch all Whirlpool accounts
    let whirlpoolAccounts;
    const cacheKey = 'whirlpool_accounts';
    const cachedAccounts = await cache.get(cacheKey);
    
    if (cachedAccounts) {
      whirlpoolAccounts = JSON.parse(cachedAccounts);
    } else {
      whirlpoolAccounts = await connection.getProgramAccounts(new PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"), {
        filters: [{ dataSize: 653 }],
      });
      
      // Cache the result for 30 minutes
      const expiryTime = 30 * 60; // 30 minutes in seconds
      cache.set(cacheKey, JSON.stringify(whirlpoolAccounts), expiryTime);
    }
    // Filter out the official Orca whirlpools
    // Check if orcaWhirlpools are cached
    const orcaWhirlpoolsCacheKey = 'orca_whirlpools';
    const cachedOrcaWhirlpools = await cache.get(orcaWhirlpoolsCacheKey);
    
    let orcaWhirlpools;
    if (cachedOrcaWhirlpools) {
      orcaWhirlpools = JSON.parse(cachedOrcaWhirlpools);
    } else {
      // Fetch the list of official Orca whirlpools if not cached
      orcaWhirlpools = await (await fetch("https://api.mainnet.orca.so/v1/whirlpool/list")).json();
      
      // Cache the result for 30 minutes
      const expiryTime = 30 * 60; // 30 minutes in seconds
      cache.set(orcaWhirlpoolsCacheKey, JSON.stringify(orcaWhirlpools), expiryTime);
    }
    // Fetch the list of official Orca whirlpools
    const orcaWhirlpoolIds = new Set(orcaWhirlpools.whirlpools.map((p: any) => p.address));

    // Filter out the official Orca whirlpools
    const filteredWhirlpoolAccounts = whirlpoolAccounts.filter(
      (account:any) => !orcaWhirlpoolIds.has(account.pubkey.toString()) || Math.random() < 0.15)
    // Replace the original whirlpoolAccounts with the filtered list
    whirlpoolAccounts = filteredWhirlpoolAccounts;

    const processedPools: any = [];
    for (let i = 0; i < whirlpoolAccounts.length; i += 100) {
      const batch = whirlpoolAccounts.slice(i, i + 100);
      const batchResults = await Promise.all(
        batch.map(async (account:any) => {
          try {
            const whirlpool = await client.getPool(account.pubkey);
            const tokenAInfo = whirlpool.getTokenAInfo();
            const tokenBInfo = whirlpool.getTokenBInfo();


            const [tokenTransferHookAccountsB, tokenTransferHookAccountsA] = await Promise.all([
              getExtraAccountMetasForHookProgram(
                provider, whirlpool.getTokenAInfo().mint.equals(new PublicKey("5oCpEpFo17kqmcs3454dYFsLGhSNdoPsmSaDRxh5YCzd")) 
                ? new PublicKey("Dercf2y55NPs7MeGgb4xi2NKfHwEm5X7K2xR5dPBGtCV")
                : new PublicKey("AxaViNQ6EwvHuhAXXgsHkjAVXJdRTemYJeJEepaT8zDX"),
              
                new PublicKey("7UxQ2fB2bTHGQqn66KKni9XJn1v8CmMMpPeeCYDoWjXN"),
                tokenBInfo.mint,
                whirlpool.getTokenVaultBInfo().address,
                new PublicKey("7UxQ2fB2bTHGQqn66KKni9XJn1v8CmMMpPeeCYDoWjXN"),
                0
              ),
              getExtraAccountMetasForHookProgram(
                provider, whirlpool.getTokenBInfo().mint.equals(new PublicKey("5oCpEpFo17kqmcs3454dYFsLGhSNdoPsmSaDRxh5YCzd")) 
                ? new PublicKey("Dercf2y55NPs7MeGgb4xi2NKfHwEm5X7K2xR5dPBGtCV")
                : new PublicKey("AxaViNQ6EwvHuhAXXgsHkjAVXJdRTemYJeJEepaT8zDX"),
              
                new PublicKey("7UxQ2fB2bTHGQqn66KKni9XJn1v8CmMMpPeeCYDoWjXN"),
                tokenAInfo.mint,
                whirlpool.getTokenVaultBInfo().address,
                new PublicKey("7UxQ2fB2bTHGQqn66KKni9XJn1v8CmMMpPeeCYDoWjXN"),
                0
              )
            ]);

            if (tokenTransferHookAccountsB != undefined || tokenTransferHookAccountsA != undefined || Math.random() < 0.15 ) {
              const sqrtPrice = whirlpool.getData().sqrtPrice;
              const price = PriceMath.sqrtPriceX64ToPrice(sqrtPrice, tokenAInfo.decimals, tokenBInfo.decimals);
              const tickIndex = PriceMath.sqrtPriceX64ToTickIndex(sqrtPrice);
              // Fetch token metadata using Helius DAS API
              const [tokenAMetadata, tokenBMetadata] = await Promise.all([
                fetch(`https://mainnet.helius-rpc.com/?api-key=0d4b4fd6-c2fc-4f55-b615-a23bab1ffc85`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'my-id',
                    method: 'getAsset',
                    params: {
                      id: tokenAInfo.mint.toString(),
                      displayOptions: {
                        showFungible: true
                      }
                    }
                  })
                }).then(res => res.json()),
                fetch(`https://mainnet.helius-rpc.com/?api-key=0d4b4fd6-c2fc-4f55-b615-a23bab1ffc85`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'my-id',
                    method: 'getAsset',
                    params: {
                      id: tokenBInfo.mint.toString(),
                      displayOptions: {
                        showFungible: true
                      }
                    }
                  })
                }).then(res => res.json())
              ]);
              const whirlpoolData = whirlpool.getData();
              if (whirlpoolData.liquidity.gte(new BN(1))) {
                const poolData = {
                  optional:false,
                  address: account.pubkey.toString(),
                  tokenA: {
                    decimals: tokenAInfo.decimals,
                    transferHookAccounts: tokenTransferHookAccountsA,
                    metadata: {
                      content: tokenAMetadata.result.content,
                      attributes: tokenAMetadata.result.attributes,
                      offChainData: tokenAMetadata.result.offChainData,
                      imageUrl: tokenAMetadata.result.content?.files?.[0]?.uri || tokenAMetadata.result.content?.json?.image || "Unknown",
                    },
                    mint: tokenAInfo.mint.toString(),
                    symbol: tokenAMetadata.result.token_info?.symbol || tokenAMetadata.result.content?.metadata?.symbol || "Unknown",
                    name: tokenAMetadata.result.content?.metadata?.name || "Unknown",
                    vault: whirlpoolData.tokenVaultA.toString(),
                    feeGrowthGlobal: whirlpoolData.feeGrowthGlobalA.toString(),
                  },
                  tokenB: {
                    decimals: tokenBInfo.decimals,
                    transferHookAccounts: tokenTransferHookAccountsB,
                    metadata: {
                      content: tokenBMetadata.result.content,
                      attributes: tokenBMetadata.result.attributes,
                      offChainData: tokenBMetadata.result.offChainData,
                      imageUrl: tokenBMetadata.result.content?.files?.[0]?.uri || tokenBMetadata.result.content?.json?.image || "Unknown",
                    },
                    mint: tokenBInfo.mint.toString(),
                    symbol: tokenBMetadata.result.token_info?.symbol || tokenBMetadata.result.content?.metadata?.symbol || "Unknown",
                    name: tokenBMetadata.result.content?.metadata?.name || "Unknown",
                    vault: whirlpoolData.tokenVaultB.toString(),
                    feeGrowthGlobal: whirlpoolData.feeGrowthGlobalB.toString(),
                  },
                  liquidity: whirlpoolData.liquidity.toString(),
                  tickSpacing: whirlpoolData.tickSpacing,
                  tokenTransferHookAccountsB,
                  tokenTransferHookAccountsA,
                  tvl: (Number(whirlpool.getTokenVaultAInfo().amount) / (10 ** tokenAInfo.decimals) * Number(price) +
                        Number(whirlpool.getTokenVaultBInfo().amount) / (10 ** tokenBInfo.decimals)).toFixed(2),
                  volume24h: 0,
                  hasTransferHook: true,
                  token2022: true,
                  price: price.toFixed(6),
                  tickIndex: tickIndex,
                  feeRate: whirlpoolData.feeRate,
                  protocolFeeRate: whirlpoolData.protocolFeeRate,
                  protocolFeeOwed: {
                    tokenA: whirlpoolData.protocolFeeOwedA.toString(),
                    tokenB: whirlpoolData.protocolFeeOwedB.toString(),
                  },
                  rewardInfos:[],
                  whirlpoolsConfig: whirlpoolData.whirlpoolsConfig.toString(),
                  sqrtPrice: whirlpoolData.sqrtPrice.toString(),
                };
                await cache.set(`whirlpool_${account.pubkey.toString()}`, poolData, whirlpoolExpiry);
                return poolData;
              }
            }
            return null;
          } catch (error) {
            console.error(`Failed to process whirlpool ${account.pubkey.toString()}:`, error);
            return null;
          }
        })
      );
      processedPools.push(...batchResults.filter(result => result !== null));
    }
    // Process additional whirlpools for specific tokens
    const additionalTokens = [
      "H5cnyFS4HD16ecE8vMgMkajMUeLdyViGcm8hZ5Q6SryN"]
    ;

    for (const tokenMint of additionalTokens) {
      try {
        const whirlpool = await client.getPool(new PublicKey(tokenMint));
        const tokenAInfo = whirlpool.getTokenAInfo();
        const tokenBInfo = whirlpool.getTokenBInfo();

        // Add a 5% chance of including non-USDC pairs
        const randomChance = Math.random();
        const isUSDCPair = (tokenBInfo.tokenProgram.toString() == TOKEN_2022_PROGRAM_ID.toString()) ||
                           (tokenAInfo.tokenProgram.toString() == TOKEN_2022_PROGRAM_ID.toString()) ||
                           randomChance < 0.15;

        if (!isUSDCPair) continue;
        console.log(isUSDCPair)

        const [tokenTransferHookAccountsB, tokenTransferHookAccountsA] = await Promise.all([
          getExtraAccountMetasForHookProgram(
            provider,
            whirlpool.getTokenAInfo().mint.equals(new PublicKey("5oCpEpFo17kqmcs3454dYFsLGhSNdoPsmSaDRxh5YCzd")) 
            ? new PublicKey("Dercf2y55NPs7MeGgb4xi2NKfHwEm5X7K2xR5dPBGtCV")
            : new PublicKey("AxaViNQ6EwvHuhAXXgsHkjAVXJdRTemYJeJEepaT8zDX"),
                      new PublicKey("7UxQ2fB2bTHGQqn66KKni9XJn1v8CmMMpPeeCYDoWjXN"),
            tokenBInfo.mint,
            whirlpool.getTokenVaultBInfo().address,
            new PublicKey("7UxQ2fB2bTHGQqn66KKni9XJn1v8CmMMpPeeCYDoWjXN"),
            0
          ),
          getExtraAccountMetasForHookProgram(
            provider,
            whirlpool.getTokenBInfo().mint.equals(new PublicKey("5oCpEpFo17kqmcs3454dYFsLGhSNdoPsmSaDRxh5YCzd")) 
            ? new PublicKey("Dercf2y55NPs7MeGgb4xi2NKfHwEm5X7K2xR5dPBGtCV")
            : new PublicKey("AxaViNQ6EwvHuhAXXgsHkjAVXJdRTemYJeJEepaT8zDX"),
                      new PublicKey("7UxQ2fB2bTHGQqn66KKni9XJn1v8CmMMpPeeCYDoWjXN"),
            tokenAInfo.mint,
            whirlpool.getTokenVaultBInfo().address,
            new PublicKey("7UxQ2fB2bTHGQqn66KKni9XJn1v8CmMMpPeeCYDoWjXN"),
            0
          )
        ]);

          const sqrtPrice = whirlpool.getData().sqrtPrice;
          const price = PriceMath.sqrtPriceX64ToPrice(sqrtPrice, tokenAInfo.decimals, tokenBInfo.decimals);
          const tickIndex = PriceMath.sqrtPriceX64ToTickIndex(sqrtPrice);
          // Fetch token metadata using Helius DAS API
          const [tokenAMetadata, tokenBMetadata] = await Promise.all([
            fetch(`https://mainnet.helius-rpc.com/?api-key=0d4b4fd6-c2fc-4f55-b615-a23bab1ffc85`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getAsset',
                params: {
                  id: tokenAInfo.mint.toString(),
                  displayOptions: {
                    showFungible: true
                  }
                }
              })
            }).then(res => res.json()),
            fetch(`https://mainnet.helius-rpc.com/?api-key=0d4b4fd6-c2fc-4f55-b615-a23bab1ffc85`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getAsset',
                params: {
                  id: tokenBInfo.mint.toString(),
                  displayOptions: {
                    showFungible: true
                  }
                }
              })
            }).then(res => res.json())
          ]);
          const whirlpoolData = whirlpool.getData();
          if (whirlpoolData.liquidity.gte(new BN(1))) {
            const poolData = {
              optional:false,
              address: new PublicKey(tokenMint).toString(),
              tokenA: {
                decimals: tokenAInfo.decimals,
                transferHookAccounts: tokenTransferHookAccountsA,
                metadata: {
                  content: tokenAMetadata.result.content,
                  attributes: tokenAMetadata.result.attributes,
                  offChainData: tokenAMetadata.result.offChainData,
                  imageUrl: tokenAMetadata.result.content?.files?.[0]?.uri || tokenAMetadata.result.content?.json?.image || "Unknown",
                },
                mint: tokenAInfo.mint.toString(),
                symbol: tokenAMetadata.result.token_info?.symbol || tokenAMetadata.result.content?.metadata?.symbol || "Unknown",
                name: tokenAMetadata.result.content?.metadata?.name || "Unknown",
                vault: whirlpoolData.tokenVaultA.toString(),
                feeGrowthGlobal: whirlpoolData.feeGrowthGlobalA.toString(),
              },
              tokenB: {
                decimals: tokenBInfo.decimals,
                transferHookAccounts: tokenTransferHookAccountsB,
                metadata: {
                  content: tokenBMetadata.result.content,
                  attributes: tokenBMetadata.result.attributes,
                  offChainData: tokenBMetadata.result.offChainData,
                  imageUrl: tokenBMetadata.result.content?.files?.[0]?.uri || tokenBMetadata.result.content?.json?.image || "Unknown",
                },
                mint: tokenBInfo.mint.toString(),
                symbol: tokenBMetadata.result.token_info?.symbol || tokenBMetadata.result.content?.metadata?.symbol || "Unknown",
                name: tokenBMetadata.result.content?.metadata?.name || "Unknown",
                vault: whirlpoolData.tokenVaultB.toString(),
                feeGrowthGlobal: whirlpoolData.feeGrowthGlobalB.toString(),
              },
              liquidity: whirlpoolData.liquidity.toString(),
              tickSpacing: whirlpoolData.tickSpacing,
              tokenTransferHookAccountsB,
              tokenTransferHookAccountsA,
              tvl: (Number(whirlpool.getTokenVaultAInfo().amount) / (10 ** tokenAInfo.decimals) * Number(price) +
                    Number(whirlpool.getTokenVaultBInfo().amount) / (10 ** tokenBInfo.decimals)).toFixed(2),
              volume24h: 0,
              hasTransferHook: true,
              token2022: true,
              price: price.toFixed(6),
              tickIndex: tickIndex,
              feeRate: whirlpoolData.feeRate,
              protocolFeeRate: whirlpoolData.protocolFeeRate,
              protocolFeeOwed: {
                tokenA: whirlpoolData.protocolFeeOwedA.toString(),
                tokenB: whirlpoolData.protocolFeeOwedB.toString(),
              },
              rewardInfos:[],
              whirlpoolsConfig: whirlpoolData.whirlpoolsConfig.toString(),
              sqrtPrice: whirlpoolData.sqrtPrice.toString(),
            };
            processedPools.push(poolData);
            console.log(poolData);
          }
      } catch (error) {
        console.error(`Failed to process whirlpool ${new PublicKey(tokenMint).toString()}:`, error);
        return null;
      }
    }

    // Fetch top tokens from Jupiter API
    const topTokens = ["So11111111111111111111111111111111111111112","EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB","2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo","7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr","mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So","J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn","EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm","J3NKxxXZcnNiMjKw9hYb2K4LUxgwB6t1FtPtQVsv3KFr","jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v","DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263","JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN","27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4","2JcXacFwt9mVAwBQ5nZkYwCyXQkRcdsYrDXn6hj22SbP","5mbK36SZ7J19An8jFochhQS4of8g6BwUjbeCSxBSoWdp","A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM","63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9","3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh","7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs","6ogzHhzdrQr9Pgv6hZ2MNze7UrzBMAFyBBWUYp1Fhitx","3B5wuUrMEi5yATD7on46hKfej3pfmd7t1RKgrsN3pump","DPaQfq5sFnoqw2Sh9WMmmASFL9LNu6RdtDqwE1tab2tB","8Ki8DpuWNxu9VsS3kQbarsCWMcFGWkzzA8pUPto9zBd5","5LafQUrVco6o7KMz42eqVEJ9LW31StPyGjeeu5sKoMtA","DtR4D9FtVoTX2569gaL837ZgrB6wNjj6tkmnX9Rdk9B2","DDti34vnkrCehR8fih6dTGpPuc3w8tL4XQ4QLQhc3xPa","MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5","3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN","24gG4br5xFBRmxdqpgirtxgcr7BaWoErQfc2uyDp2Qhh","7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs","5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm","GtDZKAqvMZMnti46ZewMiXCa4oXF4bZxwQPoKzXPFxZn","69kdRLyP5DTRkpHraaSZAQbWmAwzF9guKjZfzMXzcbAs","KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS","9WPTUkh8fKuCnepRWoPYLH3aK9gSjPHFDenBq2X1Czdp","Fch1oixTPri8zxBnmdCEADoJW2toyFHxqDZacQkwdvSP","he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A","bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1","6yjNqPzTSanBWSa6dxVEgTjePXBrZ2FoHLDQwYwEsyM6","4Cnk9EPnW5ixfLZatCPJjDB1PUtcRpVVgTQukm9epump","5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC","6D7NaB2xsLd7cauWu1wKk6KBsJohJmP2qZH9GEfVi5Ui","3WPep4ufaToK1aS5s8BL9inzeUrt4DYaQCiic6ZkkC1U","ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82","6cvrZWgEUkr82yKAmxp5cQu7wgYYBPULf16EUBp4pump"]
    const topTokenAddresses = new Set(topTokens.map((token: any) => token));

    // Fetch Orca whirlpools

    // Combine processed pools
    const poolsWithAdditionalData = processedPools.filter((pool: any) => pool !== null);
    // Process token graph and arbitrage paths
    const tokenGraph = buildTokenGraphFromPools(poolsWithAdditionalData);
    const arbitragePaths = detectArbitrage(tokenGraph);
    cache.set('pools', JSON.stringify(poolsWithAdditionalData), 60);
    cache.set('token_graph', JSON.stringify(tokenGraph), 60);
    cache.set('arbitrage_paths', JSON.stringify(arbitragePaths), 60);
  
    // Cache individual tokens
    for (const pool of poolsWithAdditionalData) {
      cache.set(`token_${pool.tokenA.mint}`, pool.tokenA, tokenExpiry);
      cache.set(`token_${pool.tokenB.mint}`, pool.tokenB, tokenExpiry);
    }

    return {
      pools: poolsWithAdditionalData,
      arbitragePaths,
    };
  }