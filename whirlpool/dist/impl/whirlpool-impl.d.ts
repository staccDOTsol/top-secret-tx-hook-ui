import type { Address } from "@coral-xyz/anchor";
import type { Percentage } from "@orca-so/common-sdk";
import { TransactionBuilder } from "@orca-so/common-sdk";
import type { PublicKey } from "@solana/web3.js";
import type { WhirlpoolContext } from "../context";
import type { DevFeeSwapInput, IncreaseLiquidityInput, SwapInput } from "../instructions";
import type { TokenAccountInfo, TokenInfo, WhirlpoolData, WhirlpoolRewardInfo } from "../types/public";
import type { Whirlpool } from "../whirlpool-client";
export declare class WhirlpoolImpl implements Whirlpool {
    readonly ctx: WhirlpoolContext;
    readonly address: PublicKey;
    readonly tokenAInfo: TokenInfo;
    readonly tokenBInfo: TokenInfo;
    private tokenVaultAInfo;
    private tokenVaultBInfo;
    private rewardInfos;
    private data;
    constructor(ctx: WhirlpoolContext, address: PublicKey, tokenAInfo: TokenInfo, tokenBInfo: TokenInfo, tokenVaultAInfo: TokenAccountInfo, tokenVaultBInfo: TokenAccountInfo, rewardInfos: WhirlpoolRewardInfo[], data: WhirlpoolData);
    getAddress(): PublicKey;
    getData(): WhirlpoolData;
    getTokenAInfo(): TokenInfo;
    getTokenBInfo(): TokenInfo;
    getTokenVaultAInfo(): TokenAccountInfo;
    getTokenVaultBInfo(): TokenAccountInfo;
    getRewardInfos(): WhirlpoolRewardInfo[];
    refreshData(): Promise<WhirlpoolData>;
    openPosition(tickLower: number, tickUpper: number, liquidityInput: IncreaseLiquidityInput, wallet?: Address, funder?: Address, positionMint?: PublicKey, tokenProgramId?: PublicKey): Promise<{
        positionMint: PublicKey;
        tx: TransactionBuilder;
    }>;
    openPositionWithMetadata(tickLower: number, tickUpper: number, liquidityInput: IncreaseLiquidityInput, sourceWallet?: Address, funder?: Address, positionMint?: PublicKey, tokenProgramId?: PublicKey): Promise<{
        positionMint: PublicKey;
        tx: TransactionBuilder;
    }>;
    initTickArrayForTicks(ticks: number[], funder?: Address, opts?: import("@orca-so/common-sdk").SimpleAccountFetchOptions): Promise<TransactionBuilder | null>;
    closePosition(positionAddress: Address, slippageTolerance: Percentage, destinationWallet?: Address, positionWallet?: Address, payer?: Address, usePriceSlippage?: boolean): Promise<TransactionBuilder[]>;
    swap(quote: SwapInput, sourceWallet?: Address): Promise<TransactionBuilder>;
    swapWithDevFees(quote: DevFeeSwapInput, devFeeWallet: PublicKey, wallet?: PublicKey | undefined, payer?: PublicKey | undefined): Promise<TransactionBuilder>;
    getOpenPositionWithOptMetadataTx(tickLower: number, tickUpper: number, liquidityInput: IncreaseLiquidityInput, wallet: PublicKey, funder: PublicKey, tokenProgramId: PublicKey, withMetadata?: boolean, positionMint?: PublicKey): Promise<{
        positionMint: PublicKey;
        tx: TransactionBuilder;
    }>;
    getClosePositionIx(positionAddress: PublicKey, slippageTolerance: Percentage, destinationWallet: PublicKey, positionWallet: PublicKey, payerKey: PublicKey, usePriceSlippage?: boolean): Promise<TransactionBuilder[]>;
    private refresh;
}
