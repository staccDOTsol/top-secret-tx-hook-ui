"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swapAsync = swapAsync;
const common_sdk_1 = require("@orca-so/common-sdk");
const __1 = require("../..");
const swap_ix_1 = require("../swap-ix");
const token_extension_util_1 = require("../../utils/public/token-extension-util");
const v2_1 = require("../v2");
const spl_token_1 = require("@solana/spl-token");
async function swapAsync(ctx, params, _opts) {
    const { wallet, whirlpool, swapInput } = params;
    const { aToB, amount, otherAmountThreshold, amountSpecifiedIsInput } = swapInput;
    const txBuilder = new common_sdk_1.TransactionBuilder(ctx.connection, ctx.wallet, ctx.txBuilderOpts);
    const data = whirlpool.getData();
    const inputTokenMint = aToB ? data.tokenMintA : data.tokenMintB;
    const maxInputAmount = amountSpecifiedIsInput ? amount : otherAmountThreshold;
    if (inputTokenMint.equals(spl_token_1.NATIVE_MINT) && maxInputAmount.eq(common_sdk_1.U64_MAX)) {
        throw new Error("Wrapping U64_MAX amount of SOL is not possible");
    }
    const [resolvedAtaA, resolvedAtaB] = await (0, common_sdk_1.resolveOrCreateATAs)(ctx.connection, wallet, [
        { tokenMint: data.tokenMintA, wrappedSolAmountIn: aToB ? maxInputAmount : common_sdk_1.ZERO },
        { tokenMint: data.tokenMintB, wrappedSolAmountIn: !aToB ? maxInputAmount : common_sdk_1.ZERO },
    ], () => ctx.fetcher.getAccountRentExempt(), undefined, true, ctx.accountResolverOpts.allowPDAOwnerAddress, ctx.accountResolverOpts.createWrappedSolAccountMethod);
    const { address: ataAKey, ...tokenOwnerAccountAIx } = resolvedAtaA;
    const { address: ataBKey, ...tokenOwnerAccountBIx } = resolvedAtaB;
    txBuilder.addInstructions([tokenOwnerAccountAIx, tokenOwnerAccountBIx]);
    const inputTokenAccount = aToB ? ataAKey : ataBKey;
    const outputTokenAccount = aToB ? ataBKey : ataAKey;
    const tokenExtensionCtx = await token_extension_util_1.TokenExtensionUtil.buildTokenExtensionContext(ctx.fetcher, data);
    const baseParams = __1.SwapUtils.getSwapParamsFromQuote(swapInput, ctx, whirlpool, inputTokenAccount, outputTokenAccount, wallet);
    return txBuilder.addInstruction(!token_extension_util_1.TokenExtensionUtil.isV2IxRequiredPool(tokenExtensionCtx) &&
        !params.swapInput.supplementalTickArrays
        ? (0, swap_ix_1.swapIx)(ctx.program, baseParams)
        : (0, v2_1.swapV2Ix)(ctx.program, {
            ...baseParams,
            tokenMintA: tokenExtensionCtx.tokenMintWithProgramA.address,
            tokenMintB: tokenExtensionCtx.tokenMintWithProgramB.address,
            tokenProgramA: tokenExtensionCtx.tokenMintWithProgramA.tokenProgram,
            tokenProgramB: tokenExtensionCtx.tokenMintWithProgramB.tokenProgram,
            ...(await token_extension_util_1.TokenExtensionUtil.getExtraAccountMetasForTransferHookForPool(ctx.connection, tokenExtensionCtx, baseParams.aToB
                ? baseParams.tokenOwnerAccountA
                : baseParams.tokenVaultA, baseParams.aToB
                ? baseParams.tokenVaultA
                : baseParams.tokenOwnerAccountA, baseParams.aToB ? baseParams.tokenAuthority : baseParams.whirlpool, baseParams.aToB
                ? baseParams.tokenVaultB
                : baseParams.tokenOwnerAccountB, baseParams.aToB
                ? baseParams.tokenOwnerAccountB
                : baseParams.tokenVaultB, baseParams.aToB ? baseParams.whirlpool : baseParams.tokenAuthority)),
            supplementalTickArrays: params.swapInput.supplementalTickArrays,
        }));
}
//# sourceMappingURL=swap-async.js.map