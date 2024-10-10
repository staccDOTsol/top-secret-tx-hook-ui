"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolUtil = void 0;
exports.toTokenAmount = toTokenAmount;
const common_sdk_1 = require("@orca-so/common-sdk");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const decimal_js_1 = __importDefault(require("decimal.js"));
const constants_1 = require("../constants");
const price_math_1 = require("./price-math");
const types_1 = require("./types");
const __1 = require("../..");
const tiny_invariant_1 = __importDefault(require("tiny-invariant"));
const spl_token_1 = require("@solana/spl-token");
class PoolUtil {
    static isRewardInitialized(rewardInfo) {
        return (!web3_js_1.PublicKey.default.equals(rewardInfo.mint) &&
            !web3_js_1.PublicKey.default.equals(rewardInfo.vault));
    }
    static getTokenType(pool, mint) {
        if (pool.tokenMintA.equals(mint)) {
            return types_1.TokenType.TokenA;
        }
        else if (pool.tokenMintB.equals(mint)) {
            return types_1.TokenType.TokenB;
        }
        return undefined;
    }
    static getFeeRate(feeRate) {
        return common_sdk_1.Percentage.fromFraction(feeRate, 1e6);
    }
    static getProtocolFeeRate(protocolFeeRate) {
        return common_sdk_1.Percentage.fromFraction(protocolFeeRate, 1e4);
    }
    static orderMints(mintX, mintY) {
        return this.compareMints(mintX, mintY) < 0
            ? [mintX, mintY]
            : [mintY, mintX];
    }
    static compareMints(mintX, mintY) {
        return Buffer.compare(common_sdk_1.AddressUtil.toPubKey(mintX).toBuffer(), common_sdk_1.AddressUtil.toPubKey(mintY).toBuffer());
    }
    static getTokenAmountsFromLiquidity(liquidity, currentSqrtPrice, lowerSqrtPrice, upperSqrtPrice, round_up) {
        const _liquidity = new decimal_js_1.default(liquidity.toString());
        const _currentPrice = new decimal_js_1.default(currentSqrtPrice.toString());
        const _lowerPrice = new decimal_js_1.default(lowerSqrtPrice.toString());
        const _upperPrice = new decimal_js_1.default(upperSqrtPrice.toString());
        let tokenA, tokenB;
        if (currentSqrtPrice.lt(lowerSqrtPrice)) {
            tokenA = common_sdk_1.MathUtil.toX64_Decimal(_liquidity)
                .mul(_upperPrice.sub(_lowerPrice))
                .div(_lowerPrice.mul(_upperPrice));
            tokenB = new decimal_js_1.default(0);
        }
        else if (currentSqrtPrice.lt(upperSqrtPrice)) {
            tokenA = common_sdk_1.MathUtil.toX64_Decimal(_liquidity)
                .mul(_upperPrice.sub(_currentPrice))
                .div(_currentPrice.mul(_upperPrice));
            tokenB = common_sdk_1.MathUtil.fromX64_Decimal(_liquidity.mul(_currentPrice.sub(_lowerPrice)));
        }
        else {
            tokenA = new decimal_js_1.default(0);
            tokenB = common_sdk_1.MathUtil.fromX64_Decimal(_liquidity.mul(_upperPrice.sub(_lowerPrice)));
        }
        if (round_up) {
            return {
                tokenA: new bn_js_1.default(tokenA.ceil().toString()),
                tokenB: new bn_js_1.default(tokenB.ceil().toString()),
            };
        }
        else {
            return {
                tokenA: new bn_js_1.default(tokenA.floor().toString()),
                tokenB: new bn_js_1.default(tokenB.floor().toString()),
            };
        }
    }
    static estimateLiquidityFromTokenAmounts(currTick, lowerTick, upperTick, tokenAmount) {
        return this.estimateMaxLiquidityFromTokenAmounts(price_math_1.PriceMath.tickIndexToSqrtPriceX64(currTick), lowerTick, upperTick, tokenAmount);
    }
    static estimateMaxLiquidityFromTokenAmounts(sqrtPriceX64, tickLowerIndex, tickUpperIndex, tokenAmount) {
        if (tickUpperIndex < tickLowerIndex) {
            throw new Error("upper tick cannot be lower than the lower tick");
        }
        const currSqrtPrice = sqrtPriceX64;
        const lowerSqrtPrice = price_math_1.PriceMath.tickIndexToSqrtPriceX64(tickLowerIndex);
        const upperSqrtPrice = price_math_1.PriceMath.tickIndexToSqrtPriceX64(tickUpperIndex);
        if (currSqrtPrice.gte(upperSqrtPrice)) {
            return estLiquidityForTokenB(upperSqrtPrice, lowerSqrtPrice, tokenAmount.tokenB);
        }
        else if (currSqrtPrice.lt(lowerSqrtPrice)) {
            return estLiquidityForTokenA(lowerSqrtPrice, upperSqrtPrice, tokenAmount.tokenA);
        }
        else {
            const estLiquidityAmountA = estLiquidityForTokenA(currSqrtPrice, upperSqrtPrice, tokenAmount.tokenA);
            const estLiquidityAmountB = estLiquidityForTokenB(currSqrtPrice, lowerSqrtPrice, tokenAmount.tokenB);
            return bn_js_1.default.min(estLiquidityAmountA, estLiquidityAmountB);
        }
    }
    static toBaseQuoteOrder(tokenMintAKey, tokenMintBKey) {
        const pair = [tokenMintAKey, tokenMintBKey];
        return pair.sort(sortByQuotePriority);
    }
    static async isSupportedToken(ctx, whirlpoolsConfig, tokenMintKey) {
        const mintWithTokenProgram = await ctx.fetcher.getMintInfo(tokenMintKey);
        (0, tiny_invariant_1.default)(mintWithTokenProgram, "Mint not found");
        if (mintWithTokenProgram.tokenProgram.equals(spl_token_1.TOKEN_PROGRAM_ID)) {
            return true;
        }
        if (mintWithTokenProgram.address.equals(spl_token_1.NATIVE_MINT_2022)) {
            return false;
        }
        const tokenBadgePda = __1.PDAUtil.getTokenBadge(ctx.program.programId, whirlpoolsConfig, tokenMintKey);
        const tokenBadge = await ctx.fetcher.getTokenBadge(tokenBadgePda.publicKey);
        const isTokenBadgeInitialized = tokenBadge !== null;
        if (mintWithTokenProgram.freezeAuthority !== null &&
            !isTokenBadgeInitialized) {
            return false;
        }
        const EXTENSION_TYPE_CONFIDENTIAL_TRANSFER_FEE_CONFIG = 16;
        const extensions = (0, spl_token_1.getExtensionTypes)(mintWithTokenProgram.tlvData);
        for (const extension of extensions) {
            switch (extension) {
                case spl_token_1.ExtensionType.TransferFeeConfig:
                case spl_token_1.ExtensionType.InterestBearingConfig:
                case spl_token_1.ExtensionType.TokenMetadata:
                case spl_token_1.ExtensionType.MetadataPointer:
                case spl_token_1.ExtensionType.ConfidentialTransferMint:
                case EXTENSION_TYPE_CONFIDENTIAL_TRANSFER_FEE_CONFIG:
                    continue;
                case spl_token_1.ExtensionType.PermanentDelegate:
                case spl_token_1.ExtensionType.TransferHook:
                case spl_token_1.ExtensionType.MintCloseAuthority:
                    if (!isTokenBadgeInitialized) {
                        return false;
                    }
                    continue;
                case spl_token_1.ExtensionType.DefaultAccountState:
                    if (!isTokenBadgeInitialized) {
                        return false;
                    }
                    const defaultAccountState = (0, spl_token_1.getDefaultAccountState)(mintWithTokenProgram);
                    if (defaultAccountState.state !== spl_token_1.AccountState.Initialized) {
                        return false;
                    }
                    continue;
                case spl_token_1.ExtensionType.NonTransferable:
                    return false;
                default:
                    return false;
            }
        }
        return true;
    }
}
exports.PoolUtil = PoolUtil;
function toTokenAmount(a, b) {
    return {
        tokenA: new bn_js_1.default(a.toString()),
        tokenB: new bn_js_1.default(b.toString()),
    };
}
const QUOTE_TOKENS = {
    [constants_1.TOKEN_MINTS["USDT"]]: 100,
    [constants_1.TOKEN_MINTS["USDC"]]: 90,
    [constants_1.TOKEN_MINTS["USDH"]]: 80,
    [constants_1.TOKEN_MINTS["SOL"]]: 70,
    [constants_1.TOKEN_MINTS["mSOL"]]: 60,
    [constants_1.TOKEN_MINTS["stSOL"]]: 50,
};
const DEFAULT_QUOTE_PRIORITY = 0;
function getQuoteTokenPriority(mint) {
    const value = QUOTE_TOKENS[mint];
    if (value) {
        return value;
    }
    return DEFAULT_QUOTE_PRIORITY;
}
function sortByQuotePriority(mintLeft, mintRight) {
    return (getQuoteTokenPriority(mintLeft.toString()) -
        getQuoteTokenPriority(mintRight.toString()));
}
function estLiquidityForTokenA(sqrtPrice1, sqrtPrice2, tokenAmount) {
    const lowerSqrtPriceX64 = bn_js_1.default.min(sqrtPrice1, sqrtPrice2);
    const upperSqrtPriceX64 = bn_js_1.default.max(sqrtPrice1, sqrtPrice2);
    const num = common_sdk_1.MathUtil.fromX64_BN(tokenAmount.mul(upperSqrtPriceX64).mul(lowerSqrtPriceX64));
    const dem = upperSqrtPriceX64.sub(lowerSqrtPriceX64);
    return num.div(dem);
}
function estLiquidityForTokenB(sqrtPrice1, sqrtPrice2, tokenAmount) {
    const lowerSqrtPriceX64 = bn_js_1.default.min(sqrtPrice1, sqrtPrice2);
    const upperSqrtPriceX64 = bn_js_1.default.max(sqrtPrice1, sqrtPrice2);
    const delta = upperSqrtPriceX64.sub(lowerSqrtPriceX64);
    return tokenAmount.shln(64).div(delta);
}
//# sourceMappingURL=pool-utils.js.map