import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { buildDefaultAccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, WhirlpoolContext, PriceMath } from "../../whirlpool";
import { addExtraAccountMetasForExecute, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

type Token = {
    mint: string;
    symbol: string;
    logoURI?: string;
  };
  
  import sqlite3 from 'sqlite3';
  import { open } from 'sqlite';
  
  // Initialize SQLite database
  let db: any;
  const initDb = async () => {
    if (!db) {
      db = await open({
        filename: './whirlpools_cache.sqlite',
        driver: sqlite3.Database
      });
  
      // Create table if it doesn't exist
      await db.exec(`
        CREATE TABLE IF NOT EXISTS cache (
          key TEXT PRIMARY KEY,
          value TEXT,
          expiry INTEGER
        )
      `);
    }
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

export  function buildTokenGraphFromPools(pools: any[]): TokenGraph {
  const graph = new TokenGraph();

  for (const pool of pools) {
    const tokenAMint = pool.tokenA.mint;
    const tokenBMint = pool.tokenB.mint;

    const priceAB = parseFloat(pool.price); // Price of tokenA in terms of tokenB
    const priceBA = 1 / priceAB; // Price of tokenB in terms of tokenA

    const edgeDataAB: EdgeData = {
      isWhirlpool: true,
      optional: pool.optional,
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
      poolData: pool,
      optional: pool.optional,
      tokenA: tokenBMint,
      tokenB: tokenAMint,
      poolAddress: pool.address,
      price: priceBA,
      liquidity: parseFloat(pool.liquidity),
      hasTransferHook: pool.hasTransferHook,
    };

    // Add edges in both directions with correct prices
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

  export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
      try {
        await initDb();

        // Check if cached data exists
        const cachedPools = await db.get('SELECT value FROM cache WHERE key = ?', ['pools']);
        const cachedArbitragePaths = await db.get('SELECT value FROM cache WHERE key = ?', ['arbitrage_paths']);

        if (cachedPools && cachedArbitragePaths) {
          // If cached data exists, return it immediately
          const responseData = {
            pools: JSON.parse(cachedPools.value),
            arbitragePaths: JSON.parse(cachedArbitragePaths.value),
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

      } catch (error) {
        console.error("Failed to fetch whirlpools:", error);
        res.status(500).json({ error: 'Failed to fetch whirlpools' });
      }
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
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
    
    await initDb();

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
    const cachedAccounts = await db.get('SELECT value FROM cache WHERE key = ? AND expiry > ?', [cacheKey, Date.now()]);
    
    if (cachedAccounts) {
      whirlpoolAccounts = JSON.parse(cachedAccounts.value);
    } else {
      whirlpoolAccounts = await connection.getProgramAccounts(new PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"), {
        filters: [{ dataSize: 653 }],
      });
      
      // Cache the result for 30 minutes
      const expiryTime = Date.now() + 30 * 60 * 1000; // 30 minutes
      await db.run('INSERT OR REPLACE INTO cache (key, value, expiry) VALUES (?, ?, ?)', 
        [cacheKey, JSON.stringify(whirlpoolAccounts), expiryTime]);
    }
    // Fetch the list of official Orca whirlpools
    const response = await fetch('https://api.mainnet.orca.so/v1/whirlpool/list');
    const orcaWhirlpools = await response.json();
    const orcaWhirlpoolIds = new Set(orcaWhirlpools.whirlpools.map((p: any) => p.address));

    // Filter out the official Orca whirlpools
    const filteredWhirlpoolAccounts = whirlpoolAccounts.filter(
      (account:any) => !orcaWhirlpoolIds.has(account.pubkey.toString()) )
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

            const isUSDCPair = ( tokenBInfo.tokenProgram.toString() == TOKEN_2022_PROGRAM_ID.toString()) ||
                               (tokenAInfo.tokenProgram.toString() == TOKEN_2022_PROGRAM_ID.toString());


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

            if (tokenTransferHookAccountsB != undefined || tokenTransferHookAccountsA != undefined) {
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
                await db.run('INSERT OR REPLACE INTO cache (key, value, expiry) VALUES (?, ?, ?)', 
                  [`whirlpool_${account.pubkey.toString()}`, JSON.stringify(poolData), whirlpoolExpiry]);
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
      "H5cnyFS4HD16ecE8vMgMkajMUeLdyViGcm8hZ5Q6SryN",
    ];

    for (const tokenMint of additionalTokens) {
      try {
        const whirlpool = await client.getPool(new PublicKey(tokenMint));
        const tokenAInfo = whirlpool.getTokenAInfo();
        const tokenBInfo = whirlpool.getTokenBInfo();

        const isUSDCPair = ( tokenBInfo.tokenProgram.toString() == TOKEN_2022_PROGRAM_ID.toString()) ||
                           (tokenAInfo.tokenProgram.toString() == TOKEN_2022_PROGRAM_ID.toString());

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
            await db.run('INSERT OR REPLACE INTO cache (key, value, expiry) VALUES (?, ?, ?)', 
              [`whirlpool_${new PublicKey(tokenMint).toString()}`, JSON.stringify(poolData), whirlpoolExpiry]);
              processedPools.push(poolData);
console.log(poolData)
          }
      } catch (error) {
        console.error(`Failed to process whirlpool ${new PublicKey(tokenMint).toString()}:`, error);
        return null;
      }

    }
    // Fetch top tokens from Jupiter API
    const topTokens = await (await fetch('https://cache.jup.ag/top-tokens')).json() as any;
    const topTokenAddresses = new Set(topTokens.map((token: any) => token));

    // Fetch Orca whirlpools
    const orcaWhirlpoolsResponse = await fetch('https://api.mainnet.orca.so/v1/whirlpool/list');
    const orcaWhirlpools2 = await orcaWhirlpoolsResponse.json();

    // Filter and process Orca whirlpools
    const orcaProcessedPools2 = [];
    const batchSize = 100;
    for (let i = 0; i < orcaWhirlpools2.whirlpools.length; i += batchSize) {
      const batch = orcaWhirlpools2.whirlpools.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch
        .filter((pool: any) => {
          console.log(pool.tokenA)
          const isTopToken = topTokenAddresses.has(pool.tokenA.mint) && topTokenAddresses.has(pool.tokenB.mint);
          const isSpecialToken = pool.tokenA.mint === "BQpGv6LVWG1JRm1NdjerNSFdChMdAULJr3x9t2Swpump" || pool.tokenB.mint === "BQpGv6LVWG1JRm1NdjerNSFdChMdAULJr3x9t2Swpump";
          return isTopToken || isSpecialToken;
        })
        .map(async (pool: any) => {
          try {
            const [tokenAMetadata, tokenBMetadata] = await Promise.all([
              fetch(`https://mainnet.helius-rpc.com/?api-key=0d4b4fd6-c2fc-4f55-b615-a23bab1ffc85`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  id: 'my-id',
                  method: 'getAsset',
                  params: {
                    id: pool.tokenA.mint,
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
                    id: pool.tokenB.mint,
                    displayOptions: {
                      showFungible: true
                    }
                  }
                })
              }).then(res => res.json())
            ]);
            const whirlpoolData = await client.getPool(new PublicKey(pool.address))
            const tokenAInfo = whirlpoolData.getTokenAInfo()
            const tokenBInfo = whirlpoolData.getTokenBInfo()
            const poolData = {
              optional: tokenAInfo.mint.toString() === 'BQpGv6LVWG1JRm1NdjerNSFdChMdAULJr3x9t2Swpump' || tokenBInfo.mint.toString() === 'BQpGv6LVWG1JRm1NdjerNSFdChMdAULJr3x9t2Swpump' ? false : true,
              address: pool.address,
              tokenA: {
                decimals: tokenAInfo.decimals,
                transferHookAccounts: [],
                metadata: {
                  content: tokenAMetadata.result?.content,
                  attributes: tokenAMetadata.result?.attributes,
                  offChainData: tokenAMetadata.result?.offChainData,
                  imageUrl: tokenAMetadata.result?.content?.files?.[0]?.uri || tokenAMetadata.result?.content?.json?.image || "Unknown",
                },
                mint: tokenAInfo.mint.toString(),
                symbol: tokenAMetadata.result?.token_info?.symbol || tokenAMetadata.result?.content?.metadata?.symbol || "Unknown",
                name: tokenAMetadata.result?.content?.metadata?.name || "Unknown",
                vault: whirlpoolData.getData().tokenVaultA.toString(),
                feeGrowthGlobal: whirlpoolData.getData().feeGrowthGlobalA.toString(),
              },
              tokenB: {
                decimals: tokenBInfo.decimals,
                transferHookAccounts: [],
                metadata: {
                  content: tokenBMetadata.result?.content,
                  attributes: tokenBMetadata.result?.attributes,
                  offChainData: tokenBMetadata.result?.offChainData,
                  imageUrl: tokenBMetadata.result?.content?.files?.[0]?.uri || tokenBMetadata.result?.content?.json?.image || "Unknown",
                },
                mint: tokenBInfo.mint.toString(),
                symbol: tokenBMetadata.result?.token_info?.symbol || tokenBMetadata.result?.content?.metadata?.symbol || "Unknown",
                name: tokenBMetadata.result?.content?.metadata?.name || "Unknown",
                vault: whirlpoolData.getData().tokenVaultB.toString(),
                feeGrowthGlobal: whirlpoolData.getData().feeGrowthGlobalB.toString(),
              },
              liquidity: pool.liquidity,
              tickSpacing: pool.tickSpacing,
              price: pool.price,
              tvl: pool.tvl,
              volume24h: pool.volume24h,
              hasTransferHook: false,
              token2022: false,
              tickIndex: pool.tickCurrentIndex,
            };
            await db.run('INSERT OR REPLACE INTO cache (key, value, expiry) VALUES (?, ?, ?)', 
              [`whirlpool_${pool.address}`, JSON.stringify(poolData), whirlpoolExpiry]);
            return poolData;
          } catch (error) {
            console.error(`Failed to process pool ${pool.address}:`, error);
            return null;
          }
        }));
      orcaProcessedPools2.push(...batchResults.filter(result => result !== null));
    }

    // Combine processed pools
    const poolsWithAdditionalData = processedPools.filter((pool: any) => pool !== null);
    poolsWithAdditionalData.push(...orcaProcessedPools2);
    // Store tokens in cache
    for (const pool of poolsWithAdditionalData) {
      await db.run('INSERT OR REPLACE INTO cache (key, value, expiry) VALUES (?, ?, ?)', 
        [`token_${pool.tokenA.mint}`, JSON.stringify(pool.tokenA), tokenExpiry]);
      await db.run('INSERT OR REPLACE INTO cache (key, value, expiry) VALUES (?, ?, ?)', 
        [`token_${pool.tokenB.mint}`, JSON.stringify(pool.tokenB), tokenExpiry]);
    }

    // Process and cache token graph and arbitrage paths
    const tokenGraph = buildTokenGraphFromPools(poolsWithAdditionalData);
    const arbitragePaths = detectArbitrage(tokenGraph);

    // Cache the results
    await db.run('INSERT OR REPLACE INTO cache (key, value, expiry) VALUES (?, ?, ?)', 
      ['pools', JSON.stringify(poolsWithAdditionalData), Date.now() + 60000]); // Cache for 1 minute
    await db.run('INSERT OR REPLACE INTO cache (key, value, expiry) VALUES (?, ?, ?)', 
      ['token_graph', JSON.stringify(tokenGraph), Date.now() + 60000]); // Cache for 1 minute
    await db.run('INSERT OR REPLACE INTO cache (key, value, expiry) VALUES (?, ?, ?)', 
      ['arbitrage_paths', JSON.stringify(arbitragePaths), Date.now() + 60000]); // Cache for 1 minute

    return {
      pools: poolsWithAdditionalData,
      arbitragePaths,
    };
  }