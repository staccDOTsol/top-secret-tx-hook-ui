import type { Address } from "@coral-xyz/anchor";
import { Percentage } from "@orca-so/common-sdk";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import type { WhirlpoolData, WhirlpoolRewardInfoData } from "../../types/public";
import { TokenType } from "./types";
import type { WhirlpoolContext } from "../..";
export declare class PoolUtil {
    static isRewardInitialized(rewardInfo: WhirlpoolRewardInfoData): boolean;
    static getTokenType(pool: WhirlpoolData, mint: PublicKey): TokenType | undefined;
    static getFeeRate(feeRate: number): Percentage;
    static getProtocolFeeRate(protocolFeeRate: number): Percentage;
    static orderMints(mintX: Address, mintY: Address): [Address, Address];
    static compareMints(mintX: Address, mintY: Address): number;
    static getTokenAmountsFromLiquidity(liquidity: BN, currentSqrtPrice: BN, lowerSqrtPrice: BN, upperSqrtPrice: BN, round_up: boolean): TokenAmounts;
    static estimateLiquidityFromTokenAmounts(currTick: number, lowerTick: number, upperTick: number, tokenAmount: TokenAmounts): BN;
    static estimateMaxLiquidityFromTokenAmounts(sqrtPriceX64: BN, tickLowerIndex: number, tickUpperIndex: number, tokenAmount: TokenAmounts): BN;
    static toBaseQuoteOrder(tokenMintAKey: PublicKey, tokenMintBKey: PublicKey): [PublicKey, PublicKey];
    static isSupportedToken(ctx: WhirlpoolContext, whirlpoolsConfig: PublicKey, tokenMintKey: PublicKey): Promise<boolean>;
}
export type TokenAmounts = {
    tokenA: BN;
    tokenB: BN;
};
export declare function toTokenAmount(a: number, b: number): TokenAmounts;
