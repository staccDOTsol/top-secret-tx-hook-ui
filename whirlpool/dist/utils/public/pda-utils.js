"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDAUtil = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const common_sdk_1 = require("@orca-so/common-sdk");
const public_1 = require("../../types/public");
const price_math_1 = require("./price-math");
const tick_utils_1 = require("./tick-utils");
const PDA_WHIRLPOOL_SEED = "whirlpool";
const PDA_POSITION_SEED = "position";
const PDA_METADATA_SEED = "metadata";
const PDA_TICK_ARRAY_SEED = "tick_array";
const PDA_FEE_TIER_SEED = "fee_tier";
const PDA_ORACLE_SEED = "oracle";
const PDA_POSITION_BUNDLE_SEED = "position_bundle";
const PDA_BUNDLED_POSITION_SEED = "bundled_position";
const PDA_CONFIG_EXTENSION_SEED = "config_extension";
const PDA_TOKEN_BADGE_SEED = "token_badge";
class PDAUtil {
    static getWhirlpool(programId, whirlpoolsConfigKey, tokenMintAKey, tokenMintBKey, tickSpacing) {
        return common_sdk_1.AddressUtil.findProgramAddress([
            Buffer.from(PDA_WHIRLPOOL_SEED),
            whirlpoolsConfigKey.toBuffer(),
            tokenMintAKey.toBuffer(),
            tokenMintBKey.toBuffer(),
            new anchor_1.BN(tickSpacing).toArrayLike(Buffer, "le", 2),
        ], programId);
    }
    static getPosition(programId, positionMintKey) {
        return common_sdk_1.AddressUtil.findProgramAddress([Buffer.from(PDA_POSITION_SEED), positionMintKey.toBuffer()], programId);
    }
    static getPositionMetadata(positionMintKey) {
        return common_sdk_1.AddressUtil.findProgramAddress([
            Buffer.from(PDA_METADATA_SEED),
            public_1.METADATA_PROGRAM_ADDRESS.toBuffer(),
            positionMintKey.toBuffer(),
        ], public_1.METADATA_PROGRAM_ADDRESS);
    }
    static getTickArray(programId, whirlpoolAddress, startTick) {
        return common_sdk_1.AddressUtil.findProgramAddress([
            Buffer.from(PDA_TICK_ARRAY_SEED),
            whirlpoolAddress.toBuffer(),
            Buffer.from(startTick.toString()),
        ], programId);
    }
    static getTickArrayFromTickIndex(tickIndex, tickSpacing, whirlpool, programId, tickArrayOffset = 0) {
        const startIndex = tick_utils_1.TickUtil.getStartTickIndex(tickIndex, tickSpacing, tickArrayOffset);
        return PDAUtil.getTickArray(common_sdk_1.AddressUtil.toPubKey(programId), common_sdk_1.AddressUtil.toPubKey(whirlpool), startIndex);
    }
    static getTickArrayFromSqrtPrice(sqrtPriceX64, tickSpacing, whirlpool, programId, tickArrayOffset = 0) {
        const tickIndex = price_math_1.PriceMath.sqrtPriceX64ToTickIndex(sqrtPriceX64);
        return PDAUtil.getTickArrayFromTickIndex(tickIndex, tickSpacing, whirlpool, programId, tickArrayOffset);
    }
    static getFeeTier(programId, whirlpoolsConfigAddress, tickSpacing) {
        return common_sdk_1.AddressUtil.findProgramAddress([
            Buffer.from(PDA_FEE_TIER_SEED),
            whirlpoolsConfigAddress.toBuffer(),
            new anchor_1.BN(tickSpacing).toArrayLike(Buffer, "le", 2),
        ], programId);
    }
    static getOracle(programId, whirlpoolAddress) {
        return common_sdk_1.AddressUtil.findProgramAddress([Buffer.from(PDA_ORACLE_SEED), whirlpoolAddress.toBuffer()], programId);
    }
    static getBundledPosition(programId, positionBundleMintKey, bundleIndex) {
        return common_sdk_1.AddressUtil.findProgramAddress([
            Buffer.from(PDA_BUNDLED_POSITION_SEED),
            positionBundleMintKey.toBuffer(),
            Buffer.from(bundleIndex.toString()),
        ], programId);
    }
    static getPositionBundle(programId, positionBundleMintKey) {
        return common_sdk_1.AddressUtil.findProgramAddress([Buffer.from(PDA_POSITION_BUNDLE_SEED), positionBundleMintKey.toBuffer()], programId);
    }
    static getPositionBundleMetadata(positionBundleMintKey) {
        return common_sdk_1.AddressUtil.findProgramAddress([
            Buffer.from(PDA_METADATA_SEED),
            public_1.METADATA_PROGRAM_ADDRESS.toBuffer(),
            positionBundleMintKey.toBuffer(),
        ], public_1.METADATA_PROGRAM_ADDRESS);
    }
    static getConfigExtension(programId, whirlpoolsConfigAddress) {
        return common_sdk_1.AddressUtil.findProgramAddress([
            Buffer.from(PDA_CONFIG_EXTENSION_SEED),
            whirlpoolsConfigAddress.toBuffer(),
        ], programId);
    }
    static getTokenBadge(programId, whirlpoolsConfigAddress, tokenMintKey) {
        return common_sdk_1.AddressUtil.findProgramAddress([
            Buffer.from(PDA_TOKEN_BADGE_SEED),
            whirlpoolsConfigAddress.toBuffer(),
            tokenMintKey.toBuffer(),
        ], programId);
    }
}
exports.PDAUtil = PDAUtil;
//# sourceMappingURL=pda-utils.js.map