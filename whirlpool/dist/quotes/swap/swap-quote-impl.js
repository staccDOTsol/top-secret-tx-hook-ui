"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateSwap = simulateSwap;
const anchor_1 = require("@coral-xyz/anchor");
const common_sdk_1 = require("@orca-so/common-sdk");
const errors_1 = require("../../errors/errors");
const public_1 = require("../../types/public");
const swap_manager_1 = require("./swap-manager");
const tick_array_sequence_1 = require("./tick-array-sequence");
const token_extension_util_1 = require("../../utils/public/token-extension-util");
function simulateSwap(params) {
    const { aToB, whirlpoolData, tickArrays, tokenAmount, sqrtPriceLimit, otherAmountThreshold, amountSpecifiedIsInput, tokenExtensionCtx, } = params;
    if (sqrtPriceLimit.gt(new anchor_1.BN(public_1.MAX_SQRT_PRICE)) ||
        sqrtPriceLimit.lt(new anchor_1.BN(public_1.MIN_SQRT_PRICE))) {
        throw new errors_1.WhirlpoolsError("Provided SqrtPriceLimit is out of bounds.", errors_1.SwapErrorCode.SqrtPriceOutOfBounds);
    }
    if ((aToB && sqrtPriceLimit.gt(whirlpoolData.sqrtPrice)) ||
        (!aToB && sqrtPriceLimit.lt(whirlpoolData.sqrtPrice))) {
        throw new errors_1.WhirlpoolsError("Provided SqrtPriceLimit is in the opposite direction of the trade.", errors_1.SwapErrorCode.InvalidSqrtPriceLimitDirection);
    }
    if (tokenAmount.eq(common_sdk_1.ZERO)) {
        throw new errors_1.WhirlpoolsError("Provided tokenAmount is zero.", errors_1.SwapErrorCode.ZeroTradableAmount);
    }
    const tickSequence = new tick_array_sequence_1.TickArraySequence(tickArrays, whirlpoolData.tickSpacing, aToB);
    if (!tickSequence.isValidTickArray0(whirlpoolData.tickCurrentIndex)) {
        throw new errors_1.WhirlpoolsError("TickArray at index 0 does not contain the Whirlpool current tick index.", errors_1.SwapErrorCode.TickArraySequenceInvalid);
    }
    if (amountSpecifiedIsInput) {
        const transferFeeExcludedIn = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeExcludedAmount(tokenAmount, aToB
            ? tokenExtensionCtx.tokenMintWithProgramA
            : tokenExtensionCtx.tokenMintWithProgramB, tokenExtensionCtx.currentEpoch);
        if (transferFeeExcludedIn.amount.eq(common_sdk_1.ZERO)) {
            throw new errors_1.WhirlpoolsError("Provided tokenAmount is virtually zero due to transfer fee.", errors_1.SwapErrorCode.ZeroTradableAmount);
        }
        const swapResults = (0, swap_manager_1.computeSwap)(whirlpoolData, tickSequence, transferFeeExcludedIn.amount, sqrtPriceLimit, amountSpecifiedIsInput, aToB);
        const transferFeeExcludedOut = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeExcludedAmount(aToB ? swapResults.amountB : swapResults.amountA, aToB
            ? tokenExtensionCtx.tokenMintWithProgramB
            : tokenExtensionCtx.tokenMintWithProgramA, tokenExtensionCtx.currentEpoch);
        if (transferFeeExcludedOut.amount.lt(otherAmountThreshold)) {
            throw new errors_1.WhirlpoolsError("Quoted amount for the other token is below the otherAmountThreshold.", errors_1.SwapErrorCode.AmountOutBelowMinimum);
        }
        const fullfilled = (aToB ? swapResults.amountA : swapResults.amountB).eq(transferFeeExcludedIn.amount);
        const transferFeeIncludedIn = fullfilled
            ? { amount: tokenAmount, fee: transferFeeExcludedIn.fee }
            : token_extension_util_1.TokenExtensionUtil.calculateTransferFeeIncludedAmount(aToB ? swapResults.amountA : swapResults.amountB, aToB
                ? tokenExtensionCtx.tokenMintWithProgramA
                : tokenExtensionCtx.tokenMintWithProgramB, tokenExtensionCtx.currentEpoch);
        const numOfTickCrossings = tickSequence.getNumOfTouchedArrays();
        if (numOfTickCrossings > public_1.MAX_SWAP_TICK_ARRAYS) {
            throw new errors_1.WhirlpoolsError(`Input amount causes the quote to traverse more than the allowable amount of tick-arrays ${numOfTickCrossings}`, errors_1.SwapErrorCode.TickArrayCrossingAboveMax);
        }
        const touchedArrays = tickSequence.getTouchedArrays(public_1.MAX_SWAP_TICK_ARRAYS);
        return {
            estimatedAmountIn: transferFeeIncludedIn.amount,
            estimatedAmountOut: transferFeeExcludedOut.amount,
            estimatedEndTickIndex: swapResults.nextTickIndex,
            estimatedEndSqrtPrice: swapResults.nextSqrtPrice,
            estimatedFeeAmount: swapResults.totalFeeAmount,
            transferFee: {
                deductingFromEstimatedAmountIn: transferFeeIncludedIn.fee,
                deductedFromEstimatedAmountOut: transferFeeExcludedOut.fee,
            },
            amount: tokenAmount,
            amountSpecifiedIsInput,
            aToB,
            otherAmountThreshold,
            sqrtPriceLimit,
            tickArray0: touchedArrays[0],
            tickArray1: touchedArrays[1],
            tickArray2: touchedArrays[2],
        };
    }
    const transferFeeIncludedOut = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeIncludedAmount(tokenAmount, aToB
        ? tokenExtensionCtx.tokenMintWithProgramB
        : tokenExtensionCtx.tokenMintWithProgramA, tokenExtensionCtx.currentEpoch);
    const swapResults = (0, swap_manager_1.computeSwap)(whirlpoolData, tickSequence, transferFeeIncludedOut.amount, sqrtPriceLimit, amountSpecifiedIsInput, aToB);
    const transferFeeIncludedIn = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeIncludedAmount(aToB ? swapResults.amountA : swapResults.amountB, aToB
        ? tokenExtensionCtx.tokenMintWithProgramA
        : tokenExtensionCtx.tokenMintWithProgramB, tokenExtensionCtx.currentEpoch);
    if (transferFeeIncludedIn.amount.gt(otherAmountThreshold)) {
        throw new errors_1.WhirlpoolsError("Quoted amount for the other token is above the otherAmountThreshold.", errors_1.SwapErrorCode.AmountInAboveMaximum);
    }
    const transferFeeExcludedOut = token_extension_util_1.TokenExtensionUtil.calculateTransferFeeExcludedAmount(aToB ? swapResults.amountB : swapResults.amountA, aToB
        ? tokenExtensionCtx.tokenMintWithProgramB
        : tokenExtensionCtx.tokenMintWithProgramA, tokenExtensionCtx.currentEpoch);
    const numOfTickCrossings = tickSequence.getNumOfTouchedArrays();
    if (numOfTickCrossings > public_1.MAX_SWAP_TICK_ARRAYS) {
        throw new errors_1.WhirlpoolsError(`Input amount causes the quote to traverse more than the allowable amount of tick-arrays ${numOfTickCrossings}`, errors_1.SwapErrorCode.TickArrayCrossingAboveMax);
    }
    const touchedArrays = tickSequence.getTouchedArrays(public_1.MAX_SWAP_TICK_ARRAYS);
    return {
        estimatedAmountIn: transferFeeIncludedIn.amount,
        estimatedAmountOut: transferFeeExcludedOut.amount,
        estimatedEndTickIndex: swapResults.nextTickIndex,
        estimatedEndSqrtPrice: swapResults.nextSqrtPrice,
        estimatedFeeAmount: swapResults.totalFeeAmount,
        transferFee: {
            deductingFromEstimatedAmountIn: transferFeeIncludedIn.fee,
            deductedFromEstimatedAmountOut: transferFeeExcludedOut.fee,
        },
        amount: tokenAmount,
        amountSpecifiedIsInput,
        aToB,
        otherAmountThreshold,
        sqrtPriceLimit,
        tickArray0: touchedArrays[0],
        tickArray1: touchedArrays[1],
        tickArray2: touchedArrays[2],
    };
}
//# sourceMappingURL=swap-quote-impl.js.map