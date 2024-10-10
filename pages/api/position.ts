import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, Transaction, ComputeBudgetProgram, Keypair, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, TOKEN_2022_PROGRAM_ID, getMint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from 'bn.js';
import { CLMM_PROGRAM_ID, getPdaProtocolPositionAddress, getPdaPersonalPositionAddress, Raydium, ApiV3PoolInfoBaseItem, parseTokenAccountResp, ClmmKeys, TickUtils, PoolUtils, struct, s32, u128, u64, bool, u8, RENT_PROGRAM_ID, METADATA_PROGRAM_ID } from '@raydium-io/raydium-sdk-v2';
import { createTransferCheckedWithTransferHookInstruction } from '@solana/spl-token';
import { AnchorProvider, Idl, Program } from 'anchor-301';
import Decimal from 'decimal.js';
import { PriceMath } from '@orca-so/whirlpools-sdk';
import * as anchor from 'anchor-301'
import { Key } from 'lucide-react';
const SOLANA_RPC_ENDPOINT = "https://rpc.ironforge.network/mainnet?apiKey=01HRZ9G6Z2A19FY8PR4RF4J4PW";
const connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");

const PROGRAM_ID = new PublicKey("AxaViNQ6EwvHuhAXXgsHkjAVXJdRTemYJeJEepaT8zDX");
const FOMO3D_MINT = new PublicKey("5oCpEpFo17kqmcs3454dYFsLGhSNdoPsmSaDRxh5YCzd");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { publicKey } = req.body;
      const walletPublicKey = new PublicKey(publicKey);
      const mintA = new PublicKey( "BQpGv6LVWG1JRm1NdjerNSFdChMdAULJr3x9t2Swpump")
    const mintB = new PublicKey( "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")

      // Fetch necessary data (pool info, token balances, etc.)
      let pools: any[] = []
      try {
        const response = await fetch('https://api.raydium.io/v2/ammV3/ammPools');
        pools = (await response.json()).data;
      } catch (error) {
        console.error("Failed to fetch Raydium pools:", error);
      }
    
  // Find existing pool with USDC mint
  let pool = pools.filter(p => 
    ((p.mintA === mintA.toBase58() && p.mintB ==mintB.toBase58())|| 
    (p.mintB === mintA.toBase58()&& p.mintA == mintB.toBase58())) && p.rewardInfos.length == 0
  )[0]
  console.log("Initializing Extra Account Meta Lists...");
  
  // Initialize Raydium SDK
  const raydium = await Raydium.load({
    connection,
    owner: walletPublicKey,
    disableLoadToken: false
  });
//  closePosition(raydium, new PublicKey(pool.id))
  if (!pool) {
    console.log("Pool doesn't exist. Aborting...");
    console.log("Pool not found");
  } else {
    console.log("Existing pool found:", pool.id);
  }

  const tokenBalance = await fetchTokenBalance(walletPublicKey, FOMO3D_MINT);

      // Calculate position size (1/100 of balance)
      const positionSize = tokenBalance.div(new BN(100));

      // Generate a new NFT mint for the position

      const [extra] = PublicKey.findProgramAddressSync(
        [Buffer.from("extra-account-metas"), FOMO3D_MINT.toBuffer()],
        PROGRAM_ID
      );

  // Fetch token info
  console.log("Fetching token information...");
  const [mintInfoA, mintInfoB] = await Promise.all([
    getMint(connection, mintA),
    getMint(connection, mintB)
  ]);
      // Determine base and quote mints based on pool configuration
      const [baseMint, quoteMint] = pool.mintA === mintA.toBase58() ? [mintInfoA, mintInfoB] : [mintInfoB, mintInfoA];
    
      console.log(`Base Token: ${baseMint.address.toBase58()}`);
      console.log(`Quote Token: ${quoteMint.address.toBase58()}`);
    
      // Get token account balances
      console.log("Fetching token balances...");
      const [tokenAccountA, tokenAccountB] = await Promise.all([
        getAssociatedTokenAddressSync(new PublicKey(pool.mintA), walletPublicKey),
        getAssociatedTokenAddressSync(new PublicKey(pool.mintB), walletPublicKey)
      ]);
      const [tokenBalanceA, tokenBalanceB] = await Promise.all([
        connection.getTokenAccountBalance(tokenAccountA),
        connection.getTokenAccountBalance(tokenAccountB)
      ]);
    
      console.log(`Base Token (${baseMint.address.toBase58()}) balance: ${tokenBalanceA.value.uiAmount}`);
      console.log(`Quote Token (${quoteMint.address.toBase58()}) balance: ${tokenBalanceB.value.uiAmount}`);
    
      // Prepare to add liquidity
      console.log("Preparing to add liquidity...");
      const baseAmount = new Decimal(tokenBalanceA.value.uiAmount as number) .mul(0.1).toFixed(baseMint.decimals); // Use 1% of balance
      const quoteAmount = new Decimal(tokenBalanceB.value.uiAmount as number).mul(0.1).toFixed(quoteMint.decimals); // Use 1% of balance
    
      console.log(`Base amount to add: ${baseAmount}`);
      console.log(`Quote amount to add: ${quoteAmount}`);
    
      
    
      // Fetch token account data
      const solAccountResp = await connection.getAccountInfo(walletPublicKey);
      const tokenAccountResp = await connection.getTokenAccountsByOwner(walletPublicKey, { programId: TOKEN_PROGRAM_ID });
      const token2022Req = await connection.getTokenAccountsByOwner(walletPublicKey, { programId: TOKEN_2022_PROGRAM_ID });
      const tokenAccountData = parseTokenAccountResp({
        owner: walletPublicKey,
        solAccountResp,
        tokenAccountResp: {
          context: tokenAccountResp.context,
          value: [...tokenAccountResp.value, ...token2022Req.value],
        },
      });
    
      // Fetch pool info
      let poolKeys: ClmmKeys | undefined;
    
     
        const data = await raydium.clmm.getPoolInfoFromRpc(pool.id);
      let  poolInfo = data.poolInfo;
        poolKeys = data.poolKeys;
    
      if (!poolInfo) {
        console.log("Pool information not found");
      }
    
    
    
      console.log("Existing pool found:", pool.id);
      // Get token account balances
      const taa = tokenAccountData.tokenAccounts.find(acc => acc.mint.equals(new PublicKey(pool.mintA)));
      const tab = tokenAccountData.tokenAccounts.find(acc => acc.mint.equals(new PublicKey(pool.mintB)));
    
      if (!tokenAccountA || !tokenAccountB) {
        console.log("Token accounts not found");
      }
      if (!taa || !tab) return
    
      console.log(`Token A (${mintA.toBase58()}) balance: ${taa.amount}`);
      console.log(`Token B (${mintB.toBase58()}) balance: ${tab.amount}`);
      const res2 = await raydium.clmm.getRpcClmmPoolInfos({
        poolIds: [pool.id],
      });
      const poolState = res2[pool.id];
      const sqrtPriceX64 = poolState.sqrtPriceX64;
      const currentTickIndex = poolState.tickCurrent;
      const price = PriceMath.tickIndexToPrice(currentTickIndex, poolInfo.mintA.decimals, poolInfo.mintB.decimals);
      const targetPrice = price.mul(new Decimal(1.01)); // Set target price 1% higher
      const [startPrice, endPrice] = [price.mul(new Decimal(0.99)), targetPrice]; // Price range from 1% below to 1% above current price
      console.log(`Current price: ${price.toFixed(6)}, Target price: ${targetPrice.toFixed(6)}`);
      console.log(`Price range: ${startPrice.toFixed(6)} - ${endPrice.toFixed(6)}`);
    
    
      // Prepare to add liquidity
      console.log("Preparing to add liquidity...");
      const ba = new BN(Number(baseAmount) * 10 ** poolInfo.mintA.decimals);
      const qa = new BN(Number(quoteAmount) * 10 ** poolInfo.mintB.decimals);
    
      const { tick: lowerTick } = TickUtils.getPriceAndTick({
        poolInfo,
        price: new Decimal(startPrice),
        baseIn: true,
      })
    
      const { tick: upperTick } = TickUtils.getPriceAndTick({
        poolInfo,
        price: new Decimal(endPrice),
        baseIn: true,
      })
      const epochInfo = await raydium.fetchEpochInfo()
      // Debug logging
      console.log("Pool Info:", poolInfo);
      console.log("Lower Tick:", lowerTick);
      console.log("Upper Tick:", upperTick);
      console.log("Amount (ba):", ba.toString());
    
      const res3 = await PoolUtils.getLiquidityAmountOutFromAmountIn({
        poolInfo,
        slippage: 0.1, // Add a small slippage to avoid precision issues
        inputA: poolInfo.mintA.address==((pool.mintA)), // Ensure correct input token
        tickUpper: Math.max(lowerTick, upperTick),
        tickLower: Math.min(lowerTick, upperTick),
        amount: ba,
        add: true,
        amountHasFee: false, // Change to false if the amount doesn't include fees
        epochInfo: epochInfo,
      });
    
      // Check the result
      console.log("Liquidity calculation result:", res);
      if (res3.liquidity.eq(new BN(0))) {
        console.error("Liquidity is zero. Possible issues:");
        console.error("1. Amount might be too small");
        console.error("2. Price range might be too narrow");
        console.error("3. Pool might have very low liquidity");
        console.log("Failed to calculate non-zero liquidity");
      }
    
    const anchorDataBuf = {
      createPool: [233, 146, 209, 142, 207, 104, 64, 188],
      initReward: [95, 135, 192, 196, 242, 129, 230, 68],
      setRewardEmissions: [112, 52, 167, 75, 32, 201, 211, 137],
      openPosition: [77, 184, 74, 214, 112, 86, 241, 199],
      closePosition: [123, 134, 81, 0, 49, 68, 98, 98],
      increaseLiquidity: [133, 29, 89, 223, 69, 238, 176, 10],
      decreaseLiquidity: [58, 127, 188, 62, 79, 82, 196, 96],
      swap: [43, 4, 237, 11, 26, 201, 30, 98], // [248, 198, 158, 145, 225, 117, 135, 200],
      collectReward: [18, 237, 166, 197, 34, 16, 213, 144],
    };
    
    function openPositionFromBaseInstruction(
      programId: PublicKey,
      payer: PublicKey,
      poolId: PublicKey,
      positionNftOwner: PublicKey,
      positionNftMint: PublicKey,
      positionNftAccount: PublicKey,
      metadataAccount: PublicKey,
      protocolPosition: PublicKey,
      tickArrayLower: PublicKey,
      tickArrayUpper: PublicKey,
      personalPosition: PublicKey,
      ownerTokenAccountA: PublicKey,
      ownerTokenAccountB: PublicKey,
      tokenVaultA: PublicKey,
      tokenVaultB: PublicKey,
      tokenMintA: PublicKey,
      tokenMintB: PublicKey,
    
      tickLowerIndex: number,
      tickUpperIndex: number,
      tickArrayLowerStartIndex: number,
      tickArrayUpperStartIndex: number,
    
      withMetadata: "create" | "no-create",
      base: "MintA" | "MintB",
      baseAmount: anchor.BN,
    
      otherAmountMax: anchor.BN,
      liquidity: anchor.BN,
      exTickArrayBitmap?: PublicKey,
    ): TransactionInstruction {
      const dataLayout = struct([
        s32("tickLowerIndex"),
        s32("tickUpperIndex"),
        s32("tickArrayLowerStartIndex"),
        s32("tickArrayUpperStartIndex"),
        u128("liquidity"),
        u64("amountMaxA"),
        u64("amountMaxB"),
        bool("withMetadata"),
        u8("optionBaseFlag"),
        bool("baseFlag"),
      ]);
    
      const remainingAccounts = [
        ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
      ];
    
      const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: positionNftOwner, isSigner: false, isWritable: false },
        { pubkey: positionNftMint, isSigner: true, isWritable: true },
        { pubkey: positionNftAccount, isSigner: false, isWritable: true },
        { pubkey: metadataAccount, isSigner: false, isWritable: true },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: protocolPosition, isSigner: false, isWritable: true },
        { pubkey: tickArrayLower, isSigner: false, isWritable: true },
        { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
        { pubkey: personalPosition, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountA, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
        { pubkey: tokenVaultA, isSigner: false, isWritable: true },
        { pubkey: tokenVaultB, isSigner: false, isWritable: true },
    
        { pubkey: RENT_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    
        { pubkey: tokenMintA, isSigner: false, isWritable: false },
        { pubkey: tokenMintB, isSigner: false, isWritable: false },
    
        ...remainingAccounts,
      ];
    
      const data = Buffer.alloc(dataLayout.span);
      dataLayout.encode(
        {
          tickLowerIndex,
          tickUpperIndex,
          tickArrayLowerStartIndex,
          tickArrayUpperStartIndex,
          liquidity,
          amountMaxA: base === "MintA" ? baseAmount : otherAmountMax,
          amountMaxB: base === "MintA" ? otherAmountMax : baseAmount,
          withMetadata: withMetadata === "create",
          baseFlag: base === "MintA",
          optionBaseFlag: 1,
        },
        data,
      );
    
      const aData = Buffer.from([...anchorDataBuf.openPosition, ...data]);
    
      return new TransactionInstruction({
        keys,
        programId,
        data: aData,
      });
    }
    
    const nftMint = Keypair.generate()
      const ix = openPositionFromBaseInstruction(
        CLMM_PROGRAM_ID,
        walletPublicKey,
        new PublicKey(pool.id),
        walletPublicKey,
        nftMint.publicKey,
        getAssociatedTokenAddressSync(nftMint.publicKey, walletPublicKey, true),
        PublicKey.findProgramAddressSync(
          [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), nftMint.publicKey.toBuffer()],
          METADATA_PROGRAM_ID
        )[0],
        getPdaProtocolPositionAddress(CLMM_PROGRAM_ID, new PublicKey(pool.id), Math.min(lowerTick, upperTick), Math.max(lowerTick, upperTick)).publicKey,
        TickUtils.getTickArrayAddressByTick(
            CLMM_PROGRAM_ID,
          new PublicKey(pool.id),
          Math.min(lowerTick, upperTick),
          pool.ammConfig.tickSpacing
        ),
        TickUtils.getTickArrayAddressByTick(
            CLMM_PROGRAM_ID,
          new PublicKey(pool.id),
          Math.max(lowerTick, upperTick),
          pool.ammConfig.tickSpacing
        ),
        getPdaPersonalPositionAddress(CLMM_PROGRAM_ID, nftMint.publicKey).publicKey,
        tokenAccountA,
        tokenAccountB,
        new PublicKey(pool.vaultA),
        new PublicKey(pool.vaultB),
        new PublicKey(pool.mintA),
        new PublicKey(pool.mintB),
        Math.min(lowerTick, upperTick),
        Math.max(lowerTick, upperTick),
        TickUtils.getTickArrayStartIndexByTick(Math.min(lowerTick, upperTick), pool.ammConfig.tickSpacing),
        TickUtils.getTickArrayStartIndexByTick(Math.max(lowerTick, upperTick), pool.ammConfig.tickSpacing),
        "no-create",
        "MintA",
        res3.amountA.amount,
        res3.amountSlippageA.amount,
        res3.liquidity
      );
      const nft = Keypair.generate()

      const proxyOpenPositionInstruction = await createOpenPositionInstruction(
        walletPublicKey,
        nftMint.publicKey,
        poolInfo,
        positionSize,
        extra, nft
      );

      // Create transaction
      const transaction = new Transaction()
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 333333 }))

       .add(ComputeBudgetProgram.setComputeUnitLimit({units: 1_400_000}))

        .add(proxyOpenPositionInstruction);

      // Add any necessary ATA creation instructions
      const ataInstructions = await createNecessaryATAs(walletPublicKey, poolInfo, FOMO3D_MINT);
      if (ataInstructions.length > 0){
      transaction.add(...ataInstructions);
      }

      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = walletPublicKey;

      // Serialize the transaction and signers
      const serializedTransaction = transaction.serialize({ requireAllSignatures: false }).toString('base64');
      const serializedSigners = [Buffer.from(nftMint.secretKey).toString('base64'), Buffer.from(nft.secretKey).toString('base64')];
      const tx = new Transaction().add(ix)
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = walletPublicKey;

      // Serialize the transaction and signers
      const tx2 = tx.serialize({ requireAllSignatures: false }).toString('base64');

      res.status(200).json({ ix: tx2, transaction: serializedTransaction, signers: serializedSigners });
    } catch (error) {
      console.error('Error creating open position transaction:', error);
      res.status(500).json({ error: 'Failed to create open position transaction' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function fetchPoolInfo(): Promise<ApiV3PoolInfoBaseItem> {
    const raydium = await Raydium.load({
        connection,
        disableLoadToken: false
    });

    const poolResponse = await raydium.api.fetchPoolByMints({
        mint1: "BQpGv6LVWG1JRm1NdjerNSFdChMdAULJr3x9t2Swpump",
        mint2: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    });

    return poolResponse.data[0] as ApiV3PoolInfoBaseItem;
}

    

async function fetchTokenBalance(walletPublicKey: PublicKey, mint: PublicKey) {
  const ata = getAssociatedTokenAddressSync(mint, walletPublicKey, true, TOKEN_2022_PROGRAM_ID);
  const balance = await connection.getTokenAccountBalance(ata);
  return new BN(balance.value.amount);
}

async function createOpenPositionInstruction(walletPublicKey: PublicKey, nftMint: PublicKey, poolInfo: any, positionSize: any, extra: PublicKey, nft: Keypair) {
  // Implement this function to create the open position instruction
  // Use the provided code as a reference
  const program = new Program({
    "address": "AxaViNQ6EwvHuhAXXgsHkjAVXJdRTemYJeJEepaT8zDX",
    "metadata": {
      "name": "transfer_hook",
      "version": "0.1.0",
      "spec": "0.1.0",
      "description": "Created with Anchor"
    },
    "instructions": [
      {
        "name": "initialize_first_extra_account_meta_list",
        "discriminator": [
          185,
          251,
          26,
          42,
          158,
          213,
          203,
          103
        ],
        "accounts": [
          {
            "name": "payer",
            "writable": true,
            "signer": true
          },
          {
            "name": "extra_account_meta_list",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    101,
                    120,
                    116,
                    114,
                    97,
                    45,
                    97,
                    99,
                    99,
                    111,
                    117,
                    110,
                    116,
                    45,
                    109,
                    101,
                    116,
                    97,
                    115
                  ]
                },
                {
                  "kind": "account",
                  "path": "mint"
                }
              ]
            }
          },
          {
            "name": "solana_safer_mewn_extra_account_meta_list",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    101,
                    120,
                    116,
                    114,
                    97,
                    45,
                    97,
                    99,
                    99,
                    111,
                    117,
                    110,
                    116,
                    45,
                    109,
                    101,
                    116,
                    97,
                    115
                  ]
                },
                {
                  "kind": "account",
                  "path": "other_mint"
                }
              ]
            }
          },
          {
            "name": "mint",
            "writable": true,
            "signer": true
          },
          {
            "name": "token_program_2022",
            "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
          },
          {
            "name": "other_mint"
          },
          {
            "name": "system_program",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "game",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    103,
                    103
                  ]
                },
                {
                  "kind": "account",
                  "path": "pool_state"
                }
              ]
            }
          },
          {
            "name": "nft_account",
            "writable": true
          },
          {
            "name": "pool_state",
            "writable": true
          },
          {
            "name": "extra_token_account_0"
          },
          {
            "name": "extra_token_account_1"
          },
          {
            "name": "raydium_amm_v3_program"
          },
          {
            "name": "token_2022_program",
            "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
          },
          {
            "name": "token_program",
            "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          },
          {
            "name": "position"
          }
        ],
        "args": []
      },
      {
        "name": "initialize_second_extra_account_meta_list",
        "discriminator": [
          222,
          114,
          208,
          10,
          49,
          246,
          98,
          103
        ],
        "accounts": [
          {
            "name": "funder",
            "writable": true,
            "signer": true
          },
          {
            "name": "extra_account_meta_list",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    101,
                    120,
                    116,
                    114,
                    97,
                    45,
                    97,
                    99,
                    99,
                    111,
                    117,
                    110,
                    116,
                    45,
                    109,
                    101,
                    116,
                    97,
                    115
                  ]
                },
                {
                  "kind": "account",
                  "path": "mint"
                }
              ]
            }
          },
          {
            "name": "solana_safer_mewn_extra_account_meta_list",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    101,
                    120,
                    116,
                    114,
                    97,
                    45,
                    97,
                    99,
                    99,
                    111,
                    117,
                    110,
                    116,
                    45,
                    109,
                    101,
                    116,
                    97,
                    115
                  ]
                },
                {
                  "kind": "account",
                  "path": "solana_safer_mewn"
                }
              ]
            }
          },
          {
            "name": "mint",
            "writable": true,
            "signer": true
          },
          {
            "name": "token_program_2022",
            "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
          },
          {
            "name": "system_program",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "solana_safer_mewn"
          },
          {
            "name": "mint_authority",
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    109,
                    105,
                    110,
                    116,
                    45,
                    97,
                    117,
                    116,
                    104,
                    111,
                    114,
                    105,
                    116,
                    121
                  ]
                }
              ]
            }
          },
          {
            "name": "game",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    103,
                    103
                  ]
                },
                {
                  "kind": "account",
                  "path": "pool_state"
                }
              ]
            }
          },
          {
            "name": "raydium_amm_v3_program"
          },
          {
            "name": "nft_account",
            "writable": true
          },
          {
            "name": "pool_state",
            "writable": true
          },
          {
            "name": "protocol_position",
            "writable": true
          },
          {
            "name": "personal_position",
            "writable": true
          },
          {
            "name": "token_account0",
            "writable": true
          },
          {
            "name": "token_account1",
            "writable": true
          },
          {
            "name": "token_vault0",
            "writable": true
          },
          {
            "name": "token_vault1",
            "writable": true
          },
          {
            "name": "tick_array_lower",
            "writable": true
          },
          {
            "name": "token_program",
            "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          },
          {
            "name": "position_info"
          }
        ],
        "args": []
      },
      {
        "name": "open_position",
        "discriminator": [
          135,
          128,
          47,
          77,
          15,
          152,
          240,
          49
        ],
        "accounts": [
          {
            "name": "funder",
            "writable": true,
            "signer": true
          },
          {
            "name": "position_nft_mint",
            "writable": true
          },
          {
            "name": "position_nft_account",
            "writable": true
          },
          {
            "name": "extra_nft_token_account",
            "writable": true,
            "signer": true
          },
          {
            "name": "pool_state",
            "writable": true
          },
          {
            "name": "protocol_position",
            "writable": true
          },
          {
            "name": "personal_position",
            "writable": true
          },
          {
            "name": "extra_token_account_0",
            "writable": true
          },
          {
            "name": "extra_token_account_1",
            "writable": true
          },
          {
            "name": "token_vault_0",
            "writable": true
          },
          {
            "name": "token_vault_1",
            "writable": true
          },
          {
            "name": "token_program",
            "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          },
          {
            "name": "system_program",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "raydium_amm_v3_program",
            "address": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
          },
          {
            "name": "position_info",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "pool_state"
                }
              ]
            }
          },
          {
            "name": "game",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    103,
                    103
                  ]
                },
                {
                  "kind": "account",
                  "path": "pool_state"
                }
              ]
            }
          },
          {
            "name": "token_program_2022",
            "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
          },
          {
            "name": "mint",
            "writable": true
          },
          {
            "name": "mint_2",
            "writable": true
          },
          {
            "name": "extra_account_meta_list",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    101,
                    120,
                    116,
                    114,
                    97,
                    45,
                    97,
                    99,
                    99,
                    111,
                    117,
                    110,
                    116,
                    45,
                    109,
                    101,
                    116,
                    97,
                    115
                  ]
                },
                {
                  "kind": "account",
                  "path": "mint"
                }
              ]
            }
          },
          {
            "name": "user_ata_2",
            "writable": true
          },
          {
            "name": "user_ata",
            "writable": true
          },
          {
            "name": "mint_authority",
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    109,
                    105,
                    110,
                    116,
                    45,
                    97,
                    117,
                    116,
                    104,
                    111,
                    114,
                    105,
                    116,
                    121
                  ]
                }
              ]
            }
          },
          {
            "name": "safe"
          }
        ],
        "args": []
      },
      {
        "name": "process_game_data",
        "discriminator": [
          133,
          3,
          246,
          229,
          164,
          19,
          15,
          208
        ],
        "accounts": [
          {
            "name": "extra_account_meta_list",
            "writable": true
          }
        ],
        "args": [
          {
            "name": "position_ref_2",
            "type": "u64"
          },
          {
            "name": "position_ref_1",
            "type": "i32"
          },
          {
            "name": "position_ref_0",
            "type": "i32"
          },
          {
            "name": "ref_0",
            "type": "i32"
          },
          {
            "name": "ref_1",
            "type": "i32"
          },
          {
            "name": "tick_spacing",
            "type": "u16"
          },
          {
            "name": "account_metas_address_configs",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          }
        ]
      },
      {
        "name": "transfer_hook",
        "discriminator": [
          220,
          57,
          220,
          152,
          126,
          125,
          97,
          168
        ],
        "accounts": [
          {
            "name": "source_token"
          },
          {
            "name": "mint"
          },
          {
            "name": "destination_token"
          },
          {
            "name": "owner"
          },
          {
            "name": "extra_account_meta_list",
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    101,
                    120,
                    116,
                    114,
                    97,
                    45,
                    97,
                    99,
                    99,
                    111,
                    117,
                    110,
                    116,
                    45,
                    109,
                    101,
                    116,
                    97,
                    115
                  ]
                },
                {
                  "kind": "account",
                  "path": "mint"
                }
              ]
            }
          },
          {
            "name": "safe",
            "writable": true
          },
          {
            "name": "game_or_ray"
          },
          {
            "name": "nft_account"
          },
          {
            "name": "pool_state",
            "writable": true
          },
          {
            "name": "token_program"
          },
          {
            "name": "protocol_position",
            "writable": true
          },
          {
            "name": "personal_position",
            "writable": true
          },
          {
            "name": "token_account0",
            "writable": true
          },
          {
            "name": "token_account1",
            "writable": true
          },
          {
            "name": "token_vault0",
            "writable": true
          },
          {
            "name": "token_vault1",
            "writable": true
          },
          {
            "name": "tick_array_lower",
            "writable": true
          },
          {
            "name": "ecosystem_transfer_hook_program"
          }
        ],
        "args": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      },
      {
        "name": "transfer_hook_update2",
        "discriminator": [
          146,
          174,
          181,
          36,
          19,
          192,
          92,
          223
        ],
        "accounts": [
          {
            "name": "payer",
            "writable": true,
            "signer": true
          },
          {
            "name": "extra_account_meta_list",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    101,
                    120,
                    116,
                    114,
                    97,
                    45,
                    97,
                    99,
                    99,
                    111,
                    117,
                    110,
                    116,
                    45,
                    109,
                    101,
                    116,
                    97,
                    115
                  ]
                },
                {
                  "kind": "account",
                  "path": "mint"
                }
              ]
            }
          },
          {
            "name": "transfer_hook_program_id"
          },
          {
            "name": "mint",
            "writable": true
          },
          {
            "name": "token_program_2022",
            "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
          },
          {
            "name": "system_program",
            "address": "11111111111111111111111111111111"
          }
        ],
        "args": []
      }
    ],
    "accounts": [
      {
        "name": "Game",
        "discriminator": [
          27,
          90,
          166,
          125,
          74,
          100,
          121,
          18
        ]
      },
      {
        "name": "PersonalPositionState",
        "discriminator": [
          70,
          111,
          150,
          126,
          230,
          15,
          25,
          117
        ]
      },
      {
        "name": "PoolState",
        "discriminator": [
          247,
          237,
          227,
          245,
          215,
          195,
          222,
          70
        ]
      },
      {
        "name": "PositionInfo",
        "discriminator": [
          78,
          184,
          87,
          177,
          69,
          87,
          87,
          153
        ]
      }
    ],
    "types": [
      {
        "name": "Game",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "other_mint",
              "type": "pubkey"
            },
            {
              "name": "total_deposited_a",
              "type": "u64"
            },
            {
              "name": "total_deposited_b",
              "type": "u64"
            },
            {
              "name": "total_liquidity_a",
              "type": "u64"
            },
            {
              "name": "total_liquidity_b",
              "type": "u64"
            },
            {
              "name": "total_fee_a",
              "type": "u64"
            },
            {
              "name": "total_fee_b",
              "type": "u64"
            },
            {
              "name": "mint",
              "type": "pubkey"
            }
          ]
        }
      },
      {
        "name": "PersonalPositionState",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "bump",
              "docs": [
                "Bump to identify PDA"
              ],
              "type": "u8"
            },
            {
              "name": "nft_mint",
              "docs": [
                "Mint address of the tokenized position"
              ],
              "type": "pubkey"
            },
            {
              "name": "pool_id",
              "docs": [
                "The ID of the pool with which this token is connected"
              ],
              "type": "pubkey"
            },
            {
              "name": "tick_lower_index",
              "docs": [
                "The lower bound tick of the position"
              ],
              "type": "i32"
            },
            {
              "name": "tick_upper_index",
              "docs": [
                "The upper bound tick of the position"
              ],
              "type": "i32"
            },
            {
              "name": "liquidity",
              "docs": [
                "The amount of liquidity owned by this position"
              ],
              "type": "u128"
            },
            {
              "name": "fee_growth_inside_0_last_x64",
              "docs": [
                "The token_0 fee growth of the aggregate position as of the last action on the individual position"
              ],
              "type": "u128"
            },
            {
              "name": "fee_growth_inside_1_last_x64",
              "docs": [
                "The token_1 fee growth of the aggregate position as of the last action on the individual position"
              ],
              "type": "u128"
            },
            {
              "name": "token_fees_owed_0",
              "docs": [
                "The fees owed to the position owner in token_0, as of the last computation"
              ],
              "type": "u64"
            },
            {
              "name": "token_fees_owed_1",
              "docs": [
                "The fees owed to the position owner in token_1, as of the last computation"
              ],
              "type": "u64"
            },
            {
              "name": "reward_infos",
              "type": {
                "array": [
                  {
                    "defined": {
                      "name": "PositionRewardInfo"
                    }
                  },
                  3
                ]
              }
            },
            {
              "name": "recent_epoch",
              "type": "u64"
            },
            {
              "name": "padding",
              "type": {
                "array": [
                  "u64",
                  7
                ]
              }
            }
          ]
        }
      },
      {
        "name": "PoolState",
        "docs": [
          "The pool state",
          "",
          "PDA of `[POOL_SEED, config, token_mint_0, token_mint_1]`",
          ""
        ],
        "serialization": "bytemuckunsafe",
        "repr": {
          "kind": "rust",
          "packed": true
        },
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "bump",
              "docs": [
                "Bump to identify PDA"
              ],
              "type": {
                "array": [
                  "u8",
                  1
                ]
              }
            },
            {
              "name": "amm_config",
              "type": "pubkey"
            },
            {
              "name": "owner",
              "type": "pubkey"
            },
            {
              "name": "token_mint_0",
              "docs": [
                "Token pair of the pool, where token_mint_0 address < token_mint_1 address"
              ],
              "type": "pubkey"
            },
            {
              "name": "token_mint_1",
              "type": "pubkey"
            },
            {
              "name": "token_vault_0",
              "docs": [
                "Token pair vault"
              ],
              "type": "pubkey"
            },
            {
              "name": "token_vault_1",
              "type": "pubkey"
            },
            {
              "name": "observation_key",
              "docs": [
                "observation account key"
              ],
              "type": "pubkey"
            },
            {
              "name": "mint_decimals_0",
              "docs": [
                "mint0 and mint1 decimals"
              ],
              "type": "u8"
            },
            {
              "name": "mint_decimals_1",
              "type": "u8"
            },
            {
              "name": "tick_spacing",
              "docs": [
                "The minimum number of ticks between initialized ticks"
              ],
              "type": "u16"
            },
            {
              "name": "liquidity",
              "docs": [
                "The currently in range liquidity available to the pool."
              ],
              "type": "u128"
            },
            {
              "name": "sqrt_price_x64",
              "docs": [
                "The current price of the pool as a sqrt(token_1/token_0) Q64.64 value"
              ],
              "type": "u128"
            },
            {
              "name": "tick_current",
              "docs": [
                "The current tick of the pool, i.e. according to the last tick transition that was run."
              ],
              "type": "i32"
            },
            {
              "name": "padding3",
              "type": "u16"
            },
            {
              "name": "padding4",
              "type": "u16"
            },
            {
              "name": "fee_growth_global_0_x64",
              "docs": [
                "The fee growth as a Q64.64 number, i.e. fees of token_0 and token_1 collected per",
                "unit of liquidity for the entire life of the pool."
              ],
              "type": "u128"
            },
            {
              "name": "fee_growth_global_1_x64",
              "type": "u128"
            },
            {
              "name": "protocol_fees_token_0",
              "docs": [
                "The amounts of token_0 and token_1 that are owed to the protocol."
              ],
              "type": "u64"
            },
            {
              "name": "protocol_fees_token_1",
              "type": "u64"
            },
            {
              "name": "swap_in_amount_token_0",
              "docs": [
                "The amounts in and out of swap token_0 and token_1"
              ],
              "type": "u128"
            },
            {
              "name": "swap_out_amount_token_1",
              "type": "u128"
            },
            {
              "name": "swap_in_amount_token_1",
              "type": "u128"
            },
            {
              "name": "swap_out_amount_token_0",
              "type": "u128"
            },
            {
              "name": "status",
              "docs": [
                "Bitwise representation of the state of the pool",
                "bit0, 1: disable open position and increase liquidity, 0: normal",
                "bit1, 1: disable decrease liquidity, 0: normal",
                "bit2, 1: disable collect fee, 0: normal",
                "bit3, 1: disable collect reward, 0: normal",
                "bit4, 1: disable swap, 0: normal"
              ],
              "type": "u8"
            },
            {
              "name": "padding",
              "docs": [
                "Leave blank for future use"
              ],
              "type": {
                "array": [
                  "u8",
                  7
                ]
              }
            },
            {
              "name": "reward_infos",
              "type": {
                "array": [
                  {
                    "defined": {
                      "name": "RewardInfo"
                    }
                  },
                  3
                ]
              }
            },
            {
              "name": "tick_array_bitmap",
              "docs": [
                "Packed initialized tick array state"
              ],
              "type": {
                "array": [
                  "u64",
                  16
                ]
              }
            },
            {
              "name": "total_fees_token_0",
              "docs": [
                "except protocol_fee and fund_fee"
              ],
              "type": "u64"
            },
            {
              "name": "total_fees_claimed_token_0",
              "docs": [
                "except protocol_fee and fund_fee"
              ],
              "type": "u64"
            },
            {
              "name": "total_fees_token_1",
              "type": "u64"
            },
            {
              "name": "total_fees_claimed_token_1",
              "type": "u64"
            },
            {
              "name": "fund_fees_token_0",
              "type": "u64"
            },
            {
              "name": "fund_fees_token_1",
              "type": "u64"
            },
            {
              "name": "open_time",
              "type": "u64"
            },
            {
              "name": "recent_epoch",
              "type": "u64"
            },
            {
              "name": "padding1",
              "type": {
                "array": [
                  "u64",
                  24
                ]
              }
            },
            {
              "name": "padding2",
              "type": {
                "array": [
                  "u64",
                  32
                ]
              }
            }
          ]
        }
      },
      {
        "name": "PositionInfo",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "tick_lower_index",
              "type": "i32"
            },
            {
              "name": "tick_upper_index",
              "type": "i32"
            },
            {
              "name": "position_key",
              "type": "pubkey"
            },
            {
              "name": "nft_account",
              "type": "pubkey"
            },
            {
              "name": "winner_ata",
              "type": "pubkey"
            },
            {
              "name": "pool_state",
              "type": "pubkey"
            },
            {
              "name": "i",
              "type": "i32"
            },
            {
              "name": "buff",
              "type": {
                "array": [
                  "u8",
                  4
                ]
              }
            }
          ]
        }
      },
      {
        "name": "PositionRewardInfo",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "growth_inside_last_x64",
              "type": "u128"
            },
            {
              "name": "reward_amount_owed",
              "type": "u64"
            }
          ]
        }
      },
      {
        "name": "RewardInfo",
        "serialization": "bytemuckunsafe",
        "repr": {
          "kind": "rust",
          "packed": true
        },
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "reward_state",
              "docs": [
                "Reward state"
              ],
              "type": "u8"
            },
            {
              "name": "open_time",
              "docs": [
                "Reward open time"
              ],
              "type": "u64"
            },
            {
              "name": "end_time",
              "docs": [
                "Reward end time"
              ],
              "type": "u64"
            },
            {
              "name": "last_update_time",
              "docs": [
                "Reward last update time"
              ],
              "type": "u64"
            },
            {
              "name": "emissions_per_second_x64",
              "docs": [
                "Q64.64 number indicates how many tokens per second are earned per unit of liquidity."
              ],
              "type": "u128"
            },
            {
              "name": "reward_total_emissioned",
              "docs": [
                "The total amount of reward emissioned"
              ],
              "type": "u64"
            },
            {
              "name": "reward_claimed",
              "docs": [
                "The total amount of claimed reward"
              ],
              "type": "u64"
            },
            {
              "name": "token_mint",
              "docs": [
                "Reward token mint."
              ],
              "type": "pubkey"
            },
            {
              "name": "token_vault",
              "docs": [
                "Reward vault token account."
              ],
              "type": "pubkey"
            },
            {
              "name": "authority",
              "docs": [
                "The owner that has permission to set reward param"
              ],
              "type": "pubkey"
            },
            {
              "name": "reward_growth_global_x64",
              "docs": [
                "Q64.64 number that tracks the total tokens earned per unit of liquidity since the reward",
                "emissions were turned on."
              ],
              "type": "u128"
            }
          ]
        }
      }
    ]
    // @ts-ignore
  } as Idl, new AnchorProvider(connection))
  poolInfo.mint = new PublicKey("5oCpEpFo17kqmcs3454dYFsLGhSNdoPsmSaDRxh5YCzd")
  console.log(poolInfo)
  return program.methods
    .openPosition()
    .accounts({
      safe: PublicKey.findProgramAddressSync([
        Buffer.from('extra-account-metas'),
        poolInfo.mint.toBuffer()
      ], PROGRAM_ID)[0],
      extraTokenAccount0: getAssociatedTokenAddressSync(new PublicKey(poolInfo.mintA.address), extra, true),
      extraTokenAccount1: getAssociatedTokenAddressSync(new PublicKey(poolInfo.mintB.address), extra, true),
      funder: walletPublicKey,
      positionNftMint: nftMint,
      positionNftAccount: getAssociatedTokenAddressSync(nftMint, walletPublicKey, true),
      extraNftTokenAccount: nft.publicKey,
      poolState: new PublicKey(poolInfo.id),
      protocolPosition: getPdaProtocolPositionAddress(CLMM_PROGRAM_ID, new PublicKey(poolInfo.id), poolInfo.lowerTick, poolInfo.upperTick).publicKey,
      personalPosition: getPdaPersonalPositionAddress(CLMM_PROGRAM_ID, nftMint).publicKey,
      tokenVault0: new PublicKey(poolInfo.vaultA),
      tokenVault1: new PublicKey(poolInfo.vaultB),
      userAta: getAssociatedTokenAddressSync(new PublicKey("DZVfZHdtS266p4qpTR7vFXxXbrBku18nt9Uxp4KD9bsi"), walletPublicKey, true),
      mint: new PublicKey("DZVfZHdtS266p4qpTR7vFXxXbrBku18nt9Uxp4KD9bsi"),
      mint2: FOMO3D_MINT,
      userAta2: getAssociatedTokenAddressSync(FOMO3D_MINT, walletPublicKey, true, TOKEN_2022_PROGRAM_ID),
    })
    .instruction();
}

async function createNecessaryATAs(walletPublicKey: PublicKey, poolInfo: any, fomo3dMint: PublicKey) {
    console.log(poolInfo)
  const instructions = [];

  const atas = [
    getAssociatedTokenAddressSync(new PublicKey(poolInfo.mintA.address), walletPublicKey, true),
    getAssociatedTokenAddressSync(new PublicKey(poolInfo.mintB.address), walletPublicKey, true),
    getAssociatedTokenAddressSync(fomo3dMint, walletPublicKey, true, TOKEN_2022_PROGRAM_ID),
  ];

  for (const ata of atas) {
    if (!(await connection.getAccountInfo(ata))) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          walletPublicKey,
          ata,
          walletPublicKey,
          new PublicKey(poolInfo.mintA),
          TOKEN_2022_PROGRAM_ID
        )
      );
    }
  }

  return instructions;
}