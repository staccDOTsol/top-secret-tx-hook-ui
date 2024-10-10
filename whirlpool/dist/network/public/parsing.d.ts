import type { AccountInfo, PublicKey } from "@solana/web3.js";
import type { FeeTierData, PositionBundleData, PositionData, TickArrayData, TokenBadgeData, WhirlpoolData, WhirlpoolsConfigData, WhirlpoolsConfigExtensionData } from "../../types/public";
export declare class ParsableWhirlpoolsConfig {
    static parse(address: PublicKey, accountData: AccountInfo<Buffer> | undefined | null): WhirlpoolsConfigData | null;
}
export declare class ParsableWhirlpool {
    static parse(address: PublicKey, accountData: AccountInfo<Buffer> | undefined | null): WhirlpoolData | null;
}
export declare class ParsablePosition {
    static parse(address: PublicKey, accountData: AccountInfo<Buffer> | undefined | null): PositionData | null;
}
export declare class ParsableTickArray {
    static parse(address: PublicKey, accountData: AccountInfo<Buffer> | undefined | null): TickArrayData | null;
}
export declare class ParsableFeeTier {
    static parse(address: PublicKey, accountData: AccountInfo<Buffer> | undefined | null): FeeTierData | null;
}
export declare class ParsablePositionBundle {
    static parse(address: PublicKey, accountData: AccountInfo<Buffer> | undefined | null): PositionBundleData | null;
}
export declare class ParsableWhirlpoolsConfigExtension {
    static parse(address: PublicKey, accountData: AccountInfo<Buffer> | undefined | null): WhirlpoolsConfigExtensionData | null;
}
export declare class ParsableTokenBadge {
    static parse(address: PublicKey, accountData: AccountInfo<Buffer> | undefined | null): TokenBadgeData | null;
}
