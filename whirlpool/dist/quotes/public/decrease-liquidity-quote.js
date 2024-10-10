"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decreaseLiquidityQuoteByLiquidity = decreaseLiquidityQuoteByLiquidity;
exports.decreaseLiquidityQuoteByLiquidityWithParams = decreaseLiquidityQuoteByLiquidityWithParams;
exports.decreaseLiquidityQuoteByLiquidityWithParamsUsingPriceSlippage = decreaseLiquidityQuoteByLiquidityWithParamsUsingPriceSlippage;
const anchor_1 = require("@coral-xyz/anchor");
const common_sdk_1 = require("@orca-so/common-sdk");
const tiny_invariant_1 = __importDefault(require("tiny-invariant"));
const position_util_1 = require("../../utils/position-util");
const public_1 = require("../../utils/public");
const token_extension_util_1 = require("../../utils/public/token-extension-util");
function decreaseLiquidityQuoteByLiquidity(liquidity, slippageTolerance, position, whirlpool, tokenExtensionCtx) {
    const positionData = position.getData();
    const whirlpoolData = whirlpool.getData();
    (0, tiny_invariant_1.default)(liquidity.lte(positionData.liquidity), "Quote liquidity is more than the position liquidity.");
    return decreaseLiquidityQuoteByLiquidityWithParams({
        liquidity,
        slippageTolerance,
        tickLowerIndex: positionData.tickLowerIndex,
        tickUpperIndex: positionData.tickUpperIndex,
        sqrtPrice: whirlpoolData.sqrtPrice,
        tickCurrentIndex: whirlpoolData.tickCurrentIndex,
        tokenExtensionCtx,
    });
}
function decreaseLiquidityQuoteByLiquidityWithParams(params) {
    (0, tiny_invariant_1.default)(public_1.TickUtil.checkTickInBounds(params.tickLowerIndex), "tickLowerIndex is out of bounds.");
    (0, tiny_invariant_1.default)(public_1.TickUtil.checkTickInBounds(params.tickUpperIndex), "tickUpperIndex is out of bounds.");
    (0, tiny_invariant_1.default)(public_1.TickUtil.checkTickInBounds(params.tickCurrentIndex), "tickCurrentIndex is out of bounds.");
    if (params.liquidity.eq(common_sdk_1.ZERO)) {
        return {
            tokenMinA: common_sdk_1.ZERO,
            tokenMinB: common_sdk_1.ZERO,
            liquidityAmount: common_sdk_1.ZERO,
            tokenEstA: common_sdk_1.ZERO,
            tokenEstB: common_sdk_1.ZERO,
            transferFee: {
                deductedFromTokenMinA: common_sdk_1.ZERO,
                deductedFromTokenMinB: common_sdk_1.ZERO,
                deductedFromTokenEstA: common_sdk_1.ZERO,
                deductedFromTokenEstB: common_sdk_1.ZERO,
            },
        };
    }
    const { tokenExtensionCtx } = params;
    const { tokenEstA, tokenEstB } = getTokenEstimatesFromLiquidity(params);
    const [tokenMinA, tokenMinB] = [tokenEstA, tokenEstB].map((tokenEst) => (0, position_util_1.adjustForSlippage)(tokenEst, params.slippageTolerance, false));
    const tokenMinAExcluded = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeExcludedAmount(tokenMinA, tokenExtensionCtx.tokenMintWithProgramA, tokenExtensionCtx.currentEpoch);
    const tokenEstAExcluded = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeExcludedAmount(tokenEstA, tokenExtensionCtx.tokenMintWithProgramA, tokenExtensionCtx.currentEpoch);
    const tokenMinBExcluded = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeExcludedAmount(tokenMinB, tokenExtensionCtx.tokenMintWithProgramB, tokenExtensionCtx.currentEpoch);
    const tokenEstBExcluded = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeExcludedAmount(tokenEstB, tokenExtensionCtx.tokenMintWithProgramB, tokenExtensionCtx.currentEpoch);
    return {
        tokenMinA: tokenMinAExcluded.amount,
        tokenMinB: tokenMinBExcluded.amount,
        tokenEstA: tokenEstAExcluded.amount,
        tokenEstB: tokenEstBExcluded.amount,
        liquidityAmount: params.liquidity,
        transferFee: {
            deductedFromTokenMinA: tokenMinAExcluded.fee,
            deductedFromTokenMinB: tokenMinBExcluded.fee,
            deductedFromTokenEstA: tokenEstAExcluded.fee,
            deductedFromTokenEstB: tokenEstBExcluded.fee,
        },
    };
}
function decreaseLiquidityQuoteByLiquidityWithParamsUsingPriceSlippage(params) {
    const { tokenExtensionCtx } = params;
    if (params.liquidity.eq(common_sdk_1.ZERO)) {
        return {
            tokenMinA: common_sdk_1.ZERO,
            tokenMinB: common_sdk_1.ZERO,
            liquidityAmount: common_sdk_1.ZERO,
            tokenEstA: common_sdk_1.ZERO,
            tokenEstB: common_sdk_1.ZERO,
            transferFee: {
                deductedFromTokenMinA: common_sdk_1.ZERO,
                deductedFromTokenMinB: common_sdk_1.ZERO,
                deductedFromTokenEstA: common_sdk_1.ZERO,
                deductedFromTokenEstB: common_sdk_1.ZERO,
            },
        };
    }
    const { tokenEstA, tokenEstB } = getTokenEstimatesFromLiquidity(params);
    const { lowerBound: [sLowerSqrtPrice, sLowerIndex], upperBound: [sUpperSqrtPrice, sUpperIndex], } = public_1.PriceMath.getSlippageBoundForSqrtPrice(params.sqrtPrice, params.slippageTolerance);
    const { tokenEstA: tokenEstALower, tokenEstB: tokenEstBLower } = getTokenEstimatesFromLiquidity({
        ...params,
        sqrtPrice: sLowerSqrtPrice,
        tickCurrentIndex: sLowerIndex,
    });
    const { tokenEstA: tokenEstAUpper, tokenEstB: tokenEstBUpper } = getTokenEstimatesFromLiquidity({
        ...params,
        sqrtPrice: sUpperSqrtPrice,
        tickCurrentIndex: sUpperIndex,
    });
    const tokenMinA = anchor_1.BN.min(anchor_1.BN.min(tokenEstA, tokenEstALower), tokenEstAUpper);
    const tokenMinB = anchor_1.BN.min(anchor_1.BN.min(tokenEstB, tokenEstBLower), tokenEstBUpper);
    const tokenMinAExcluded = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeExcludedAmount(tokenMinA, tokenExtensionCtx.tokenMintWithProgramA, tokenExtensionCtx.currentEpoch);
    const tokenEstAExcluded = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeExcludedAmount(tokenEstA, tokenExtensionCtx.tokenMintWithProgramA, tokenExtensionCtx.currentEpoch);
    const tokenMinBExcluded = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeExcludedAmount(tokenMinB, tokenExtensionCtx.tokenMintWithProgramB, tokenExtensionCtx.currentEpoch);
    const tokenEstBExcluded = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeExcludedAmount(tokenEstB, tokenExtensionCtx.tokenMintWithProgramB, tokenExtensionCtx.currentEpoch);
    return {
        tokenMinA: tokenMinAExcluded.amount,
        tokenMinB: tokenMinBExcluded.amount,
        tokenEstA: tokenEstAExcluded.amount,
        tokenEstB: tokenEstBExcluded.amount,
        liquidityAmount: params.liquidity,
        transferFee: {
            deductedFromTokenMinA: tokenMinAExcluded.fee,
            deductedFromTokenMinB: tokenMinBExcluded.fee,
            deductedFromTokenEstA: tokenEstAExcluded.fee,
            deductedFromTokenEstB: tokenEstBExcluded.fee,
        },
    };
}
function getTokenEstimatesFromLiquidity(params) {
    const { liquidity, tickLowerIndex, tickUpperIndex, sqrtPrice } = params;
    if (liquidity.eq(common_sdk_1.ZERO)) {
        throw new Error("liquidity must be greater than 0");
    }
    let tokenEstA = common_sdk_1.ZERO;
    let tokenEstB = common_sdk_1.ZERO;
    const lowerSqrtPrice = public_1.PriceMath.tickIndexToSqrtPriceX64(tickLowerIndex);
    const upperSqrtPrice = public_1.PriceMath.tickIndexToSqrtPriceX64(tickUpperIndex);
    const positionStatus = position_util_1.PositionUtil.getStrictPositionStatus(sqrtPrice, tickLowerIndex, tickUpperIndex);
    if (positionStatus === position_util_1.PositionStatus.BelowRange) {
        tokenEstA = (0, position_util_1.getTokenAFromLiquidity)(liquidity, lowerSqrtPrice, upperSqrtPrice, false);
    }
    else if (positionStatus === position_util_1.PositionStatus.InRange) {
        tokenEstA = (0, position_util_1.getTokenAFromLiquidity)(liquidity, sqrtPrice, upperSqrtPrice, false);
        tokenEstB = (0, position_util_1.getTokenBFromLiquidity)(liquidity, lowerSqrtPrice, sqrtPrice, false);
    }
    else {
        tokenEstB = (0, position_util_1.getTokenBFromLiquidity)(liquidity, lowerSqrtPrice, upperSqrtPrice, false);
    }
    return { tokenEstA, tokenEstB };
}
//# sourceMappingURL=decrease-liquidity-quote.js.map