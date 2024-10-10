import { BN } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";
export declare class PDAUtil {
    static getWhirlpool(programId: PublicKey, whirlpoolsConfigKey: PublicKey, tokenMintAKey: PublicKey, tokenMintBKey: PublicKey, tickSpacing: number): import("@orca-so/common-sdk").PDA;
    static getPosition(programId: PublicKey, positionMintKey: PublicKey): import("@orca-so/common-sdk").PDA;
    static getPositionMetadata(positionMintKey: PublicKey): import("@orca-so/common-sdk").PDA;
    static getTickArray(programId: PublicKey, whirlpoolAddress: PublicKey, startTick: number): import("@orca-so/common-sdk").PDA;
    static getTickArrayFromTickIndex(tickIndex: number, tickSpacing: number, whirlpool: PublicKey, programId: PublicKey, tickArrayOffset?: number): import("@orca-so/common-sdk").PDA;
    static getTickArrayFromSqrtPrice(sqrtPriceX64: BN, tickSpacing: number, whirlpool: PublicKey, programId: PublicKey, tickArrayOffset?: number): import("@orca-so/common-sdk").PDA;
    static getFeeTier(programId: PublicKey, whirlpoolsConfigAddress: PublicKey, tickSpacing: number): import("@orca-so/common-sdk").PDA;
    static getOracle(programId: PublicKey, whirlpoolAddress: PublicKey): import("@orca-so/common-sdk").PDA;
    static getBundledPosition(programId: PublicKey, positionBundleMintKey: PublicKey, bundleIndex: number): import("@orca-so/common-sdk").PDA;
    static getPositionBundle(programId: PublicKey, positionBundleMintKey: PublicKey): import("@orca-so/common-sdk").PDA;
    static getPositionBundleMetadata(positionBundleMintKey: PublicKey): import("@orca-so/common-sdk").PDA;
    static getConfigExtension(programId: PublicKey, whirlpoolsConfigAddress: PublicKey): import("@orca-so/common-sdk").PDA;
    static getTokenBadge(programId: PublicKey, whirlpoolsConfigAddress: PublicKey, tokenMintKey: PublicKey): import("@orca-so/common-sdk").PDA;
}
