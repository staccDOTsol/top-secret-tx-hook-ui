import type { BN, Idl } from "@coral-xyz/anchor";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";
export declare enum AccountName {
    WhirlpoolsConfig = "WhirlpoolsConfig",
    Position = "Position",
    TickArray = "TickArray",
    Whirlpool = "Whirlpool",
    FeeTier = "FeeTier",
    PositionBundle = "PositionBundle",
    WhirlpoolsConfigExtension = "WhirlpoolsConfigExtension",
    TokenBadge = "TokenBadge"
}
export declare const WHIRLPOOL_IDL: Idl;
export declare const WHIRLPOOL_CODER: BorshAccountsCoder<string>;
export declare function getAccountSize(accountName: AccountName): number;
export declare const WHIRLPOOL_ACCOUNT_SIZE: number;
export type WhirlpoolsConfigData = {
    feeAuthority: PublicKey;
    collectProtocolFeesAuthority: PublicKey;
    rewardEmissionsSuperAuthority: PublicKey;
    defaultFeeRate: number;
    defaultProtocolFeeRate: number;
};
export type WhirlpoolRewardInfoData = {
    mint: PublicKey;
    vault: PublicKey;
    authority: PublicKey;
    emissionsPerSecondX64: BN;
    growthGlobalX64: BN;
};
export type WhirlpoolBumpsData = {
    whirlpoolBump: number;
};
export type WhirlpoolData = {
    whirlpoolsConfig: PublicKey;
    whirlpoolBump: number[];
    feeRate: number;
    protocolFeeRate: number;
    liquidity: BN;
    sqrtPrice: BN;
    tickCurrentIndex: number;
    protocolFeeOwedA: BN;
    protocolFeeOwedB: BN;
    tokenMintA: PublicKey;
    tokenVaultA: PublicKey;
    feeGrowthGlobalA: BN;
    tokenMintB: PublicKey;
    tokenVaultB: PublicKey;
    feeGrowthGlobalB: BN;
    rewardLastUpdatedTimestamp: BN;
    rewardInfos: WhirlpoolRewardInfoData[];
    tickSpacing: number;
};
export type TickArrayData = {
    whirlpool: PublicKey;
    startTickIndex: number;
    ticks: TickData[];
};
export type TickData = {
    initialized: boolean;
    liquidityNet: BN;
    liquidityGross: BN;
    feeGrowthOutsideA: BN;
    feeGrowthOutsideB: BN;
    rewardGrowthsOutside: BN[];
};
export type PositionRewardInfoData = {
    growthInsideCheckpoint: BN;
    amountOwed: BN;
};
export type OpenPositionBumpsData = {
    positionBump: number;
};
export type OpenPositionWithMetadataBumpsData = {
    positionBump: number;
    metadataBump: number;
};
export type PositionData = {
    whirlpool: PublicKey;
    positionMint: PublicKey;
    liquidity: BN;
    tickLowerIndex: number;
    tickUpperIndex: number;
    feeGrowthCheckpointA: BN;
    feeOwedA: BN;
    feeGrowthCheckpointB: BN;
    feeOwedB: BN;
    rewardInfos: PositionRewardInfoData[];
};
export type FeeTierData = {
    whirlpoolsConfig: PublicKey;
    tickSpacing: number;
    defaultFeeRate: number;
};
export type PositionBundleData = {
    positionBundleMint: PublicKey;
    positionBitmap: number[];
};
export type WhirlpoolsConfigExtensionData = {
    whirlpoolsConfig: PublicKey;
    configExtensionAuthority: PublicKey;
    tokenBadgeAuthority: PublicKey;
};
export type TokenBadgeData = {
    whirlpoolsConfig: PublicKey;
    tokenMint: PublicKey;
};
