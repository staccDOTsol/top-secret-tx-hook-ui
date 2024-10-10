"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapUtils = void 0;
const common_sdk_1 = require("@orca-so/common-sdk");
const bn_js_1 = __importDefault(require("bn.js"));
const __1 = require("../..");
const public_1 = require("../../types/public");
const token_math_1 = require("../math/token-math");
const pda_utils_1 = require("./pda-utils");
const pool_utils_1 = require("./pool-utils");
const types_1 = require("./types");
const swap_utils_1 = require("../swap-utils");
class SwapUtils {
    static getDefaultSqrtPriceLimit(aToB) {
        return new bn_js_1.default(aToB ? public_1.MIN_SQRT_PRICE : public_1.MAX_SQRT_PRICE);
    }
    static getDefaultOtherAmountThreshold(amountSpecifiedIsInput) {
        return amountSpecifiedIsInput ? common_sdk_1.ZERO : common_sdk_1.U64_MAX;
    }
    static getSwapDirection(pool, swapTokenMint, swapTokenIsInput) {
        const tokenType = pool_utils_1.PoolUtil.getTokenType(pool, swapTokenMint);
        if (!tokenType) {
            return undefined;
        }
        return (tokenType === types_1.TokenType.TokenA) === swapTokenIsInput
            ? types_1.SwapDirection.AtoB
            : types_1.SwapDirection.BtoA;
    }
    static getTickArrayPublicKeys(tickCurrentIndex, tickSpacing, aToB, programId, whirlpoolAddress) {
        return (0, swap_utils_1.getTickArrayPublicKeysWithStartTickIndex)(tickCurrentIndex, tickSpacing, aToB, programId, whirlpoolAddress).map((p) => p.pubkey);
    }
    static getFallbackTickArrayPublicKey(tickArrays, tickSpacing, aToB, programId, whirlpoolAddress) {
        try {
            const fallbackStartTickIndex = __1.TickUtil.getStartTickIndex(tickArrays[0].startTickIndex, tickSpacing, aToB ? 1 : -1);
            const pda = pda_utils_1.PDAUtil.getTickArray(programId, whirlpoolAddress, fallbackStartTickIndex);
            return pda.publicKey;
        }
        catch {
            return undefined;
        }
    }
    static async getTickArrays(tickCurrentIndex, tickSpacing, aToB, programId, whirlpoolAddress, fetcher, opts) {
        const data = await this.getBatchTickArrays(programId, fetcher, [{ tickCurrentIndex, tickSpacing, aToB, whirlpoolAddress }], opts);
        return data[0];
    }
    static async getBatchTickArrays(programId, fetcher, tickArrayRequests, opts) {
        let addresses = [];
        let requestToIndices = [];
        for (let i = 0; i < tickArrayRequests.length; i++) {
            const { tickCurrentIndex, tickSpacing, aToB, whirlpoolAddress } = tickArrayRequests[i];
            const requestAddresses = (0, swap_utils_1.getTickArrayPublicKeysWithStartTickIndex)(tickCurrentIndex, tickSpacing, aToB, programId, whirlpoolAddress);
            requestToIndices.push([
                addresses.length,
                addresses.length + requestAddresses.length,
            ]);
            addresses.push(...requestAddresses);
        }
        const data = await fetcher.getTickArrays(addresses.map((a) => a.pubkey), opts);
        return requestToIndices.map((indices) => {
            const [start, end] = indices;
            const addressSlice = addresses.slice(start, end);
            const dataSlice = data.slice(start, end);
            return addressSlice.map((addr, index) => ({
                address: addr.pubkey,
                startTickIndex: addr.startTickIndex,
                data: dataSlice[index],
            }));
        });
    }
    static interpolateUninitializedTickArrays(whirlpoolAddress, tickArrays) {
        return tickArrays.map((tickArray) => ({
            address: tickArray.address,
            startTickIndex: tickArray.startTickIndex,
            data: tickArray.data ??
                (0, swap_utils_1.buildZeroedTickArray)(whirlpoolAddress, tickArray.startTickIndex),
        }));
    }
    static calculateSwapAmountsFromQuote(amount, estAmountIn, estAmountOut, slippageTolerance, amountSpecifiedIsInput) {
        if (amountSpecifiedIsInput) {
            return {
                amount,
                otherAmountThreshold: (0, token_math_1.adjustForSlippage)(estAmountOut, slippageTolerance, false),
            };
        }
        else {
            return {
                amount,
                otherAmountThreshold: (0, token_math_1.adjustForSlippage)(estAmountIn, slippageTolerance, true),
            };
        }
    }
    static getSwapParamsFromQuote(quote, ctx, whirlpool, inputTokenAssociatedAddress, outputTokenAssociatedAddress, wallet) {
        const data = whirlpool.getData();
        return this.getSwapParamsFromQuoteKeys(quote, ctx, whirlpool.getAddress(), data.tokenVaultA, data.tokenVaultB, inputTokenAssociatedAddress, outputTokenAssociatedAddress, wallet);
    }
    static getSwapParamsFromQuoteKeys(quote, ctx, whirlpool, tokenVaultA, tokenVaultB, inputTokenAssociatedAddress, outputTokenAssociatedAddress, wallet) {
        const aToB = quote.aToB;
        const [inputTokenATA, outputTokenATA] = common_sdk_1.AddressUtil.toPubKeys([
            inputTokenAssociatedAddress,
            outputTokenAssociatedAddress,
        ]);
        const oraclePda = pda_utils_1.PDAUtil.getOracle(ctx.program.programId, whirlpool);
        const params = {
            whirlpool,
            tokenOwnerAccountA: aToB ? inputTokenATA : outputTokenATA,
            tokenOwnerAccountB: aToB ? outputTokenATA : inputTokenATA,
            tokenVaultA,
            tokenVaultB,
            oracle: oraclePda.publicKey,
            tokenAuthority: wallet,
            ...quote,
        };
        return params;
    }
}
exports.SwapUtils = SwapUtils;
//# sourceMappingURL=swap-utils.js.map