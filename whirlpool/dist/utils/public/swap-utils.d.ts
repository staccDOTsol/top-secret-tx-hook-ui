import type { Address } from "@coral-xyz/anchor";
import type { Percentage } from "@orca-so/common-sdk";
import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import type { WhirlpoolContext } from "../..";
import type { WhirlpoolAccountFetchOptions, WhirlpoolAccountFetcherInterface } from "../../network/public/fetcher";
import type { SwapInput, SwapParams, TickArray, WhirlpoolData } from "../../types/public";
import type { Whirlpool } from "../../whirlpool-client";
import { SwapDirection } from "./types";
export interface TickArrayRequest {
    whirlpoolAddress: PublicKey;
    aToB: boolean;
    tickCurrentIndex: number;
    tickSpacing: number;
}
export declare class SwapUtils {
    static getDefaultSqrtPriceLimit(aToB: boolean): BN;
    static getDefaultOtherAmountThreshold(amountSpecifiedIsInput: boolean): BN;
    static getSwapDirection(pool: WhirlpoolData, swapTokenMint: PublicKey, swapTokenIsInput: boolean): SwapDirection | undefined;
    static getTickArrayPublicKeys(tickCurrentIndex: number, tickSpacing: number, aToB: boolean, programId: PublicKey, whirlpoolAddress: PublicKey): PublicKey[];
    static getFallbackTickArrayPublicKey(tickArrays: TickArray[], tickSpacing: number, aToB: boolean, programId: PublicKey, whirlpoolAddress: PublicKey): PublicKey | undefined;
    static getTickArrays(tickCurrentIndex: number, tickSpacing: number, aToB: boolean, programId: PublicKey, whirlpoolAddress: PublicKey, fetcher: WhirlpoolAccountFetcherInterface, opts?: WhirlpoolAccountFetchOptions): Promise<TickArray[]>;
    static getBatchTickArrays(programId: PublicKey, fetcher: WhirlpoolAccountFetcherInterface, tickArrayRequests: TickArrayRequest[], opts?: WhirlpoolAccountFetchOptions): Promise<TickArray[][]>;
    static interpolateUninitializedTickArrays(whirlpoolAddress: PublicKey, tickArrays: TickArray[]): TickArray[];
    static calculateSwapAmountsFromQuote(amount: BN, estAmountIn: BN, estAmountOut: BN, slippageTolerance: Percentage, amountSpecifiedIsInput: boolean): Pick<SwapInput, "amount" | "otherAmountThreshold">;
    static getSwapParamsFromQuote(quote: SwapInput, ctx: WhirlpoolContext, whirlpool: Whirlpool, inputTokenAssociatedAddress: Address, outputTokenAssociatedAddress: Address, wallet: PublicKey): SwapParams;
    static getSwapParamsFromQuoteKeys(quote: SwapInput, ctx: WhirlpoolContext, whirlpool: PublicKey, tokenVaultA: PublicKey, tokenVaultB: PublicKey, inputTokenAssociatedAddress: Address, outputTokenAssociatedAddress: Address, wallet: PublicKey): SwapParams;
}
