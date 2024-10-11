// pages/api/arbitrage.ts

import { NextApiRequest, NextApiResponse } from 'next';
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
  SystemProgram,Transaction
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync, NATIVE_MINT, createSyncNativeInstruction, createAssociatedTokenAccountInstruction, createCloseAccountInstruction,TOKEN_2022_PROGRAM_ID,addExtraAccountMetasForExecute } from '@solana/spl-token';
import { buildTokenGraphFromPools, TokenGraph } from '../api/whirlpools'
import { WhirlpoolContext, WhirlpoolIx, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, buildDefaultAccountFetcher, MIN_SQRT_PRICE, MAX_SQRT_PRICE, TickArrayUtil, PDAUtil, TickUtil, PriceMath, MIN_TICK_INDEX, MAX_TICK_INDEX } from '@orca-so/whirlpools-sdk';
import { BN } from 'bn.js';
import { AnchorProvider } from '@coral-xyz/anchor';

const SOLANA_RPC_ENDPOINT = "https://rpc.ironforge.network/mainnet?apiKey=01HRZ9G6Z2A19FY8PR4RF4J4PW";
const connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
      try {
        const { publicKeyBase58, amount, path } = req.body;
  
        if (!publicKeyBase58 || !amount || !path || !Array.isArray(path)) {
          return res.status(400).json({ error: 'Missing or invalid parameters' });
        }
  
        const walletPublicKey = new PublicKey(publicKeyBase58);
        const startingAmount = Number(amount);
  
        const poolsResponse = await fetch('https://top-secret-tx-hook-ui-git-main-jarett-dunns-projects.vercel.app/api/whirlpools');
        const poolsData = await poolsResponse.json();
  
        const graph = buildTokenGraphFromPools(poolsData.pools || poolsData);
        
        // Use the provided path directly
        const arbitragePath = path;
    
        if (arbitragePath.length < 2) {
          return res.status(400).json({ error: 'Invalid arbitrage path. Must contain at least two tokens.' });
        }
  
        console.log('Arbitrage path:', arbitragePath);
  
        const serializedTransactions = await performArbitrage(
          connection,
          walletPublicKey,
          graph,
          startingAmount,
          arbitragePath
        );
  
        res.status(200).json({ serializedTransactions, arbitragePath });
      } catch (error) {
        console.error('Error during arbitrage:', error);
        res.status(500).json({ error: 'Arbitrage execution failed.' });
      }
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  }

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
async function performArbitrage(
  connection: Connection,
  walletPublicKey: PublicKey,
  graph: TokenGraph,
  amount: number,
  arbitragePath: string[],
): Promise<string[]> {
  const transactionInstructions: TransactionInstruction[] = [];

  
  const serializedTransactions: string[] = [];

  const isStartingWithSOL = arbitragePath[0] === NATIVE_MINT.toBase58() || arbitragePath[0] === 'So11111111111111111111111111111111111111112';
  const isEndingWithSOL = arbitragePath[arbitragePath.length - 1] === NATIVE_MINT.toBase58() || arbitragePath[arbitragePath.length - 1] === 'So11111111111111111111111111111111111111112';

  if (isStartingWithSOL) {
    const userWSOLATA = getAssociatedTokenAddressSync(NATIVE_MINT, walletPublicKey);
    transactionInstructions.push(
      createAssociatedTokenAccountInstruction(walletPublicKey, userWSOLATA, walletPublicKey, NATIVE_MINT),
      SystemProgram.transfer({ fromPubkey: walletPublicKey, toPubkey: userWSOLATA, lamports: amount }),
      createSyncNativeInstruction(userWSOLATA)
    );
  }

  let currentAmount = amount;

  let aToB: boolean | undefined;
  for (let i = 0; i < arbitragePath.length - 1; i++) {
    const fromToken = arbitragePath[i];
    const toToken = arbitragePath[i + 1];
    const edgeData = graph.edges.get(fromToken)?.get(toToken);

    if (!edgeData) {
      throw new Error(`Edge data not found for ${fromToken} -> ${toToken}`);
    }

    if (edgeData.isWhirlpool) {
      const provider = new AnchorProvider(connection, {} as any, {});
      // @ts-ignore
      const fetcher = buildDefaultAccountFetcher(connection);
      // @ts-ignore
      const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID, fetcher);
      const client = buildWhirlpoolClient(ctx);

      const whirlpoolPubkey = new PublicKey(edgeData.poolAddress);
      const whirlpool = await client.getPool(whirlpoolPubkey);

      const [startTickIndex, endTickIndex] = TickUtil.getFullRangeTickIndex(
        whirlpool.getData().tickSpacing
      );
      const startInitializableTickIndex = TickUtil.getStartTickIndex(
        startTickIndex,
        whirlpool.getData().tickSpacing
      );
      const endInitializableTickIndex = TickUtil.getStartTickIndex(
        endTickIndex,
        whirlpool.getData().tickSpacing
      );

      const startTickArrayPda = PDAUtil.getTickArray(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpoolPubkey,
        startInitializableTickIndex
      );

      const endTickArrayPda = PDAUtil.getTickArray(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpoolPubkey,
        endInitializableTickIndex
      );

      const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
      const solMint = NATIVE_MINT;
      
      if (aToB === undefined) {
        aToB = (i === 0 && whirlpool.getTokenAInfo().mint.equals(usdcMint)) ? true : 
      (i === 0 && whirlpool.getTokenAInfo().mint.equals(usdcMint)) ? true : 
      (i === 0 && whirlpool.getTokenBInfo().mint.equals(usdcMint)) ? false :
      (whirlpool.getTokenAInfo().mint.equals(solMint)) ? true : false;
      } else {
        aToB = !aToB; // Flip aToB for subsequent swaps
      }

      console.log(`Swapping from ${aToB ? "A to B" : "B to A"}`);

      const tokenOwnerAccountA = getAssociatedTokenAddressSync(whirlpool.getTokenAInfo().mint, walletPublicKey, true, whirlpool.getTokenAInfo().tokenProgram);
      const tokenOwnerAccountB = getAssociatedTokenAddressSync(whirlpool.getTokenBInfo().mint, walletPublicKey, true, whirlpool.getTokenBInfo().tokenProgram);
      // Create ATAs for tokenA and tokenB if they don't exist
      const createAtaInstructions: TransactionInstruction[] = [];

      // Check and create ATA for tokenA
      try {
        await connection.getTokenAccountBalance(tokenOwnerAccountA);
      } catch (error) {
        createAtaInstructions.push(
          createAssociatedTokenAccountInstruction(
            walletPublicKey,
            tokenOwnerAccountA,
            walletPublicKey,
            whirlpool.getTokenAInfo().mint,

            whirlpool.getTokenAInfo().tokenProgram
          )
        );
      }

      // Check and create ATA for tokenB
      try {
        await connection.getTokenAccountBalance(tokenOwnerAccountB);
      } catch (error) {
        createAtaInstructions.push(
          createAssociatedTokenAccountInstruction(
            walletPublicKey,
            tokenOwnerAccountB,
            walletPublicKey,
            whirlpool.getTokenBInfo().mint,

            whirlpool.getTokenBInfo().tokenProgram
          )
        );
      }

      // Add ATA creation instructions to the transaction
      transactionInstructions.push(...createAtaInstructions);


      const tokenTransferHookAccountsA =
      await getExtraAccountMetasForHookProgram(
        provider,
        
        whirlpool.getTokenAInfo().mint.equals(new PublicKey("5oCpEpFo17kqmcs3454dYFsLGhSNdoPsmSaDRxh5YCzd")) 
        ? new PublicKey("Dercf2y55NPs7MeGgb4xi2NKfHwEm5X7K2xR5dPBGtCV")
        : new PublicKey("AxaViNQ6EwvHuhAXXgsHkjAVXJdRTemYJeJEepaT8zDX"),
              tokenOwnerAccountA,
        whirlpool.getTokenAInfo().mint,
        whirlpool.getTokenVaultAInfo().address,
        walletPublicKey,
        currentAmount
      );
      const tokenTransferHookAccountsB =
      await getExtraAccountMetasForHookProgram(
        provider,
        whirlpool.getTokenBInfo().mint.equals(new PublicKey("5oCpEpFo17kqmcs3454dYFsLGhSNdoPsmSaDRxh5YCzd")) 
        ? new PublicKey("Dercf2y55NPs7MeGgb4xi2NKfHwEm5X7K2xR5dPBGtCV")
        : new PublicKey("AxaViNQ6EwvHuhAXXgsHkjAVXJdRTemYJeJEepaT8zDX"),
              tokenOwnerAccountB,
        whirlpool.getTokenBInfo().mint,
        whirlpool.getTokenVaultBInfo().address,
        walletPublicKey,
        currentAmount
      );
      const swapParams = {
        tokenTransferHookAccountsB,
        tokenTransferHookAccountsA,
        amount: new BN(currentAmount.toString()),
        otherAmountThreshold: new BN(0),
        sqrtPriceLimit: aToB ? PriceMath.tickIndexToSqrtPriceX64(MIN_TICK_INDEX) : PriceMath.tickIndexToSqrtPriceX64(MAX_TICK_INDEX),
        amountSpecifiedIsInput: true,
        aToB: aToB,
        whirlpool: whirlpoolPubkey,
        tokenAuthority: walletPublicKey,
        tokenOwnerAccountA: tokenOwnerAccountA,
        tokenOwnerAccountB: tokenOwnerAccountB,
        tokenVaultA: whirlpool.getTokenVaultAInfo().address,
        tokenVaultB: whirlpool.getTokenVaultBInfo().address,
        tickArray0: startTickArrayPda.publicKey,
        tickArray1: endTickArrayPda.publicKey,
        tickArray2: endTickArrayPda.publicKey,
        oracle: PDAUtil.getOracle(ORCA_WHIRLPOOL_PROGRAM_ID, whirlpoolPubkey).publicKey,
        tokenMintA: whirlpool.getTokenAInfo().mint,
        tokenMintB: whirlpool.getTokenBInfo().mint,
        tokenProgramA: whirlpool.getTokenAInfo().tokenProgram,
        tokenProgramB: whirlpool.getTokenBInfo().tokenProgram,
      };

      const swapIx = WhirlpoolIx.swapV2Ix(ctx.program, swapParams);
      serializedTransactions.push(await createAndSerializeTransaction(connection, walletPublicKey, swapIx.instructions));

      currentAmount = Math.floor(currentAmount * edgeData.price * (1 - 0.005));
      if (transactionInstructions.length > 0 ) {
      // Check if we need to create a new transaction
      if (getTransactionSize(transactionInstructions, walletPublicKey, (await connection.getLatestBlockhash()).blockhash) > 1200) {
        serializedTransactions.push(await createAndSerializeTransaction(connection, walletPublicKey, transactionInstructions));
        transactionInstructions.length = 0; // Clear the instructions array
      }
    }
  }
  }

  if (isEndingWithSOL) {
    const userWSOLATA = getAssociatedTokenAddressSync(NATIVE_MINT, walletPublicKey);
    transactionInstructions.push(createCloseAccountInstruction(userWSOLATA, walletPublicKey, walletPublicKey));
  }

  // Create the final transaction if there are remaining instructions
  if (transactionInstructions.length > 0) {
    serializedTransactions.push(await createAndSerializeTransaction(connection, walletPublicKey, transactionInstructions));
    serializedTransactions.push(await createAndSerializeTransaction(connection, walletPublicKey, transactionInstructions));

    serializedTransactions.push(await createAndSerializeTransaction(connection, walletPublicKey, transactionInstructions));

    serializedTransactions.push(await createAndSerializeTransaction(connection, walletPublicKey, transactionInstructions));
    serializedTransactions.push(await createAndSerializeTransaction(connection, walletPublicKey, transactionInstructions));

    serializedTransactions.push(await createAndSerializeTransaction(connection, walletPublicKey, transactionInstructions));


    serializedTransactions.push(await createAndSerializeTransaction(connection, walletPublicKey, transactionInstructions));

    serializedTransactions.push(await createAndSerializeTransaction(connection, walletPublicKey, transactionInstructions));

    serializedTransactions.push(await createAndSerializeTransaction(connection, walletPublicKey, transactionInstructions));

  }

  return serializedTransactions;
}

async function createAndSerializeTransaction(
  connection: Connection,
  walletPublicKey: PublicKey,
  instructions: TransactionInstruction[]
): Promise<string> { 

  const latestBlockhash = await connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: walletPublicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [ComputeBudgetProgram.setComputeUnitLimit({units: 1_400_000}),ComputeBudgetProgram.requestHeapFrame({bytes: 256*1024}),
       ...instructions]
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);
  return Buffer.from(transaction.serialize()).toString('base64');
}

function getTransactionSize(instructions: TransactionInstruction[], pubkey: PublicKey, blockhash: string): number {
  const transaction = new Transaction().add(...instructions);
transaction.recentBlockhash  = blockhash
transaction.feePayer = pubkey
try {
  const serializedTransaction = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false
  });
  const base64Transaction = Buffer.from(serializedTransaction).toString('base64');
  console.log(base64Transaction.length)
  return base64Transaction.length;

} catch (err){
  return 1429
}
}
