import type { Address } from "@coral-xyz/anchor";
import type { Percentage, TransactionBuilder } from "@orca-so/common-sdk";
import type { PublicKey } from "@solana/web3.js";
import type { WhirlpoolContext } from "./context";
import type { DevFeeSwapInput, SwapInput } from "./instructions";
import type { WhirlpoolAccountFetchOptions, WhirlpoolAccountFetcherInterface } from "./network/public/fetcher";
import type { WhirlpoolRouter } from "./router/public";
import type { DecreaseLiquidityInput, IncreaseLiquidityInput, PositionData, TickData, WhirlpoolData } from "./types/public";
import type { TokenAccountInfo, TokenInfo, WhirlpoolRewardInfo } from "./types/public/client-types";
import type Decimal from "decimal.js";
export interface WhirlpoolClient {
    getContext: () => WhirlpoolContext;
    getFetcher: () => WhirlpoolAccountFetcherInterface;
    getRouter: (poolAddresses: Address[]) => Promise<WhirlpoolRouter>;
    getPool: (poolAddress: Address, opts?: WhirlpoolAccountFetchOptions) => Promise<Whirlpool>;
    getPools: (poolAddresses: Address[], opts?: WhirlpoolAccountFetchOptions) => Promise<Whirlpool[]>;
    getPosition: (positionAddress: Address, opts?: WhirlpoolAccountFetchOptions) => Promise<Position>;
    getPositions: (positionAddresses: Address[], opts?: WhirlpoolAccountFetchOptions) => Promise<Record<string, Position | null>>;
    collectFeesAndRewardsForPositions: (positionAddresses: Address[], opts?: WhirlpoolAccountFetchOptions) => Promise<TransactionBuilder[]>;
    createSplashPool: (whirlpoolsConfig: Address, tokenMintA: Address, tokenMintB: Address, initialPrice: Decimal, funder: Address) => Promise<{
        poolKey: PublicKey;
        tx: TransactionBuilder;
    }>;
    createPool: (whirlpoolsConfig: Address, tokenMintA: Address, tokenMintB: Address, tickSpacing: number, initialTick: number, funder: Address) => Promise<{
        poolKey: PublicKey;
        tx: TransactionBuilder;
    }>;
    collectProtocolFeesForPools: (poolAddresses: Address[]) => Promise<TransactionBuilder>;
}
export declare function buildWhirlpoolClient(ctx: WhirlpoolContext): WhirlpoolClient;
export interface Whirlpool {
    getAddress: () => PublicKey;
    getData: () => WhirlpoolData;
    refreshData: () => Promise<WhirlpoolData>;
    getTokenAInfo: () => TokenInfo;
    getTokenBInfo: () => TokenInfo;
    getTokenVaultAInfo: () => TokenAccountInfo;
    getTokenVaultBInfo: () => TokenAccountInfo;
    getRewardInfos: () => WhirlpoolRewardInfo[];
    initTickArrayForTicks: (ticks: number[], funder?: Address, opts?: WhirlpoolAccountFetchOptions) => Promise<TransactionBuilder | null>;
    openPosition: (tickLower: number, tickUpper: number, liquidityInput: IncreaseLiquidityInput, wallet?: Address, funder?: Address, positionMint?: PublicKey, tokenProgramId?: PublicKey) => Promise<{
        positionMint: PublicKey;
        tx: TransactionBuilder;
    }>;
    openPositionWithMetadata: (tickLower: number, tickUpper: number, liquidityInput: IncreaseLiquidityInput, wallet?: Address, funder?: Address, positionMint?: PublicKey, tokenProgramId?: PublicKey) => Promise<{
        positionMint: PublicKey;
        tx: TransactionBuilder;
    }>;
    closePosition: (positionAddress: Address, slippageTolerance: Percentage, destinationWallet?: Address, positionWallet?: Address, payer?: Address, usePriceSlippage?: boolean) => Promise<TransactionBuilder[]>;
    swap: (input: SwapInput, wallet?: PublicKey) => Promise<TransactionBuilder>;
    swapWithDevFees: (input: DevFeeSwapInput, devFeeWallet: PublicKey, wallet?: PublicKey, payer?: PublicKey) => Promise<TransactionBuilder>;
}
export interface Position {
    getAddress: () => PublicKey;
    getPositionMintTokenProgramId: () => PublicKey;
    getData: () => PositionData;
    getWhirlpoolData: () => WhirlpoolData;
    getLowerTickData: () => TickData;
    getUpperTickData: () => TickData;
    refreshData: () => Promise<PositionData>;
    increaseLiquidity: (liquidityInput: IncreaseLiquidityInput, resolveATA?: boolean, wallet?: Address, positionWallet?: Address, ataPayer?: Address) => Promise<TransactionBuilder>;
    decreaseLiquidity: (liquidityInput: DecreaseLiquidityInput, resolveATA?: boolean, destinationWallet?: Address, positionWallet?: Address, ataPayer?: Address) => Promise<TransactionBuilder>;
    collectFees: (updateFeesAndRewards?: boolean, ownerTokenAccountMap?: Partial<Record<string, Address>>, destinationWallet?: Address, positionWallet?: Address, ataPayer?: Address, opts?: WhirlpoolAccountFetchOptions) => Promise<TransactionBuilder>;
    collectRewards: (rewardsToCollect?: Address[], updateFeesAndRewards?: boolean, ownerTokenAccountMap?: Partial<Record<string, Address>>, destinationWallet?: Address, positionWallet?: Address, ataPayer?: Address, opts?: WhirlpoolAccountFetchOptions) => Promise<TransactionBuilder[]>;
}
