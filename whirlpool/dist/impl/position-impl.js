"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PositionImpl = void 0;
const common_sdk_1 = require("@orca-so/common-sdk");
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const tiny_invariant_1 = __importDefault(require("tiny-invariant"));
const instructions_1 = require("../instructions");
const fetcher_1 = require("../network/public/fetcher");
const position_builder_util_1 = require("../utils/builder/position-builder-util");
const public_1 = require("../utils/public");
const whirlpool_ata_utils_1 = require("../utils/whirlpool-ata-utils");
const token_extension_util_1 = require("../utils/public/token-extension-util");
const txn_utils_1 = require("../utils/txn-utils");
class PositionImpl {
    ctx;
    address;
    positionMintTokenProgramId;
    data;
    whirlpoolData;
    lowerTickArrayData;
    upperTickArrayData;
    constructor(ctx, address, data, whirlpoolData, lowerTickArrayData, upperTickArrayData, positionMintTokenProgramId) {
        this.ctx = ctx;
        this.address = address;
        this.positionMintTokenProgramId = positionMintTokenProgramId;
        this.data = data;
        this.whirlpoolData = whirlpoolData;
        this.lowerTickArrayData = lowerTickArrayData;
        this.upperTickArrayData = upperTickArrayData;
    }
    getAddress() {
        return this.address;
    }
    getPositionMintTokenProgramId() {
        return this.positionMintTokenProgramId;
    }
    getData() {
        return this.data;
    }
    getWhirlpoolData() {
        return this.whirlpoolData;
    }
    getLowerTickData() {
        return public_1.TickArrayUtil.getTickFromArray(this.lowerTickArrayData, this.data.tickLowerIndex, this.whirlpoolData.tickSpacing);
    }
    getUpperTickData() {
        return public_1.TickArrayUtil.getTickFromArray(this.upperTickArrayData, this.data.tickUpperIndex, this.whirlpoolData.tickSpacing);
    }
    async refreshData() {
        await this.refresh();
        return this.data;
    }
    async increaseLiquidity(liquidityInput, resolveATA = true, sourceWallet, positionWallet, ataPayer) {
        const sourceWalletKey = sourceWallet
            ? common_sdk_1.AddressUtil.toPubKey(sourceWallet)
            : this.ctx.wallet.publicKey;
        const positionWalletKey = positionWallet
            ? common_sdk_1.AddressUtil.toPubKey(positionWallet)
            : this.ctx.wallet.publicKey;
        const ataPayerKey = ataPayer
            ? common_sdk_1.AddressUtil.toPubKey(ataPayer)
            : this.ctx.wallet.publicKey;
        const whirlpool = await this.ctx.fetcher.getPool(this.data.whirlpool, fetcher_1.IGNORE_CACHE);
        if (!whirlpool) {
            throw new Error("Unable to fetch whirlpool for this position.");
        }
        const tokenExtensionCtx = await token_extension_util_1.TokenExtensionUtil.buildTokenExtensionContext(this.ctx.fetcher, whirlpool, fetcher_1.IGNORE_CACHE);
        const txBuilder = new common_sdk_1.TransactionBuilder(this.ctx.provider.connection, this.ctx.provider.wallet, this.ctx.txBuilderOpts);
        let tokenOwnerAccountA;
        let tokenOwnerAccountB;
        if (resolveATA) {
            const [ataA, ataB] = await (0, common_sdk_1.resolveOrCreateATAs)(this.ctx.connection, sourceWalletKey, [
                {
                    tokenMint: whirlpool.tokenMintA,
                    wrappedSolAmountIn: liquidityInput.tokenMaxA,
                },
                {
                    tokenMint: whirlpool.tokenMintB,
                    wrappedSolAmountIn: liquidityInput.tokenMaxB,
                },
            ], () => this.ctx.fetcher.getAccountRentExempt(), ataPayerKey, undefined, this.ctx.accountResolverOpts.allowPDAOwnerAddress, this.ctx.accountResolverOpts.createWrappedSolAccountMethod);
            const { address: ataAddrA, ...tokenOwnerAccountAIx } = ataA;
            const { address: ataAddrB, ...tokenOwnerAccountBIx } = ataB;
            tokenOwnerAccountA = ataAddrA;
            tokenOwnerAccountB = ataAddrB;
            txBuilder.addInstruction(tokenOwnerAccountAIx);
            txBuilder.addInstruction(tokenOwnerAccountBIx);
        }
        else {
            tokenOwnerAccountA = (0, spl_token_1.getAssociatedTokenAddressSync)(whirlpool.tokenMintA, sourceWalletKey, this.ctx.accountResolverOpts.allowPDAOwnerAddress, tokenExtensionCtx.tokenMintWithProgramA.tokenProgram);
            tokenOwnerAccountB = (0, spl_token_1.getAssociatedTokenAddressSync)(whirlpool.tokenMintB, sourceWalletKey, this.ctx.accountResolverOpts.allowPDAOwnerAddress, tokenExtensionCtx.tokenMintWithProgramB.tokenProgram);
        }
        const positionTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(this.data.positionMint, positionWalletKey, this.ctx.accountResolverOpts.allowPDAOwnerAddress, this.positionMintTokenProgramId);
        const baseParams = {
            ...liquidityInput,
            whirlpool: this.data.whirlpool,
            position: this.address,
            positionTokenAccount,
            tokenOwnerAccountA,
            tokenOwnerAccountB,
            tokenVaultA: whirlpool.tokenVaultA,
            tokenVaultB: whirlpool.tokenVaultB,
            tickArrayLower: public_1.PDAUtil.getTickArray(this.ctx.program.programId, this.data.whirlpool, public_1.TickUtil.getStartTickIndex(this.data.tickLowerIndex, whirlpool.tickSpacing)).publicKey,
            tickArrayUpper: public_1.PDAUtil.getTickArray(this.ctx.program.programId, this.data.whirlpool, public_1.TickUtil.getStartTickIndex(this.data.tickUpperIndex, whirlpool.tickSpacing)).publicKey,
            positionAuthority: positionWalletKey,
        };
        const increaseIx = !token_extension_util_1.TokenExtensionUtil.isV2IxRequiredPool(tokenExtensionCtx)
            ? (0, instructions_1.increaseLiquidityIx)(this.ctx.program, baseParams)
            : (0, instructions_1.increaseLiquidityV2Ix)(this.ctx.program, {
                ...baseParams,
                tokenMintA: whirlpool.tokenMintA,
                tokenMintB: whirlpool.tokenMintB,
                tokenProgramA: tokenExtensionCtx.tokenMintWithProgramA.tokenProgram,
                tokenProgramB: tokenExtensionCtx.tokenMintWithProgramB.tokenProgram,
                ...(await token_extension_util_1.TokenExtensionUtil.getExtraAccountMetasForTransferHookForPool(this.ctx.connection, tokenExtensionCtx, baseParams.tokenOwnerAccountA, baseParams.tokenVaultA, baseParams.positionAuthority, baseParams.tokenOwnerAccountB, baseParams.tokenVaultB, baseParams.positionAuthority)),
            });
        txBuilder.addInstruction(increaseIx);
        return txBuilder;
    }
    async decreaseLiquidity(liquidityInput, resolveATA = true, sourceWallet, positionWallet, ataPayer) {
        const sourceWalletKey = sourceWallet
            ? common_sdk_1.AddressUtil.toPubKey(sourceWallet)
            : this.ctx.wallet.publicKey;
        const positionWalletKey = positionWallet
            ? common_sdk_1.AddressUtil.toPubKey(positionWallet)
            : this.ctx.wallet.publicKey;
        const ataPayerKey = ataPayer
            ? common_sdk_1.AddressUtil.toPubKey(ataPayer)
            : this.ctx.wallet.publicKey;
        const whirlpool = await this.ctx.fetcher.getPool(this.data.whirlpool, fetcher_1.IGNORE_CACHE);
        if (!whirlpool) {
            throw new Error("Unable to fetch whirlpool for this position.");
        }
        const tokenExtensionCtx = await token_extension_util_1.TokenExtensionUtil.buildTokenExtensionContext(this.ctx.fetcher, whirlpool, fetcher_1.IGNORE_CACHE);
        const txBuilder = new common_sdk_1.TransactionBuilder(this.ctx.provider.connection, this.ctx.provider.wallet, this.ctx.txBuilderOpts);
        let tokenOwnerAccountA;
        let tokenOwnerAccountB;
        if (resolveATA) {
            const [ataA, ataB] = await (0, common_sdk_1.resolveOrCreateATAs)(this.ctx.connection, sourceWalletKey, [
                { tokenMint: whirlpool.tokenMintA },
                { tokenMint: whirlpool.tokenMintB },
            ], () => this.ctx.fetcher.getAccountRentExempt(), ataPayerKey, undefined, this.ctx.accountResolverOpts.allowPDAOwnerAddress, this.ctx.accountResolverOpts.createWrappedSolAccountMethod);
            const { address: ataAddrA, ...tokenOwnerAccountAIx } = ataA;
            const { address: ataAddrB, ...tokenOwnerAccountBIx } = ataB;
            tokenOwnerAccountA = ataAddrA;
            tokenOwnerAccountB = ataAddrB;
            txBuilder.addInstruction(tokenOwnerAccountAIx);
            txBuilder.addInstruction(tokenOwnerAccountBIx);
        }
        else {
            tokenOwnerAccountA = (0, spl_token_1.getAssociatedTokenAddressSync)(whirlpool.tokenMintA, sourceWalletKey, this.ctx.accountResolverOpts.allowPDAOwnerAddress, tokenExtensionCtx.tokenMintWithProgramA.tokenProgram);
            tokenOwnerAccountB = (0, spl_token_1.getAssociatedTokenAddressSync)(whirlpool.tokenMintB, sourceWalletKey, this.ctx.accountResolverOpts.allowPDAOwnerAddress, tokenExtensionCtx.tokenMintWithProgramB.tokenProgram);
        }
        const baseParams = {
            ...liquidityInput,
            whirlpool: this.data.whirlpool,
            position: this.address,
            positionTokenAccount: (0, spl_token_1.getAssociatedTokenAddressSync)(this.data.positionMint, positionWalletKey, this.ctx.accountResolverOpts.allowPDAOwnerAddress, this.positionMintTokenProgramId),
            tokenOwnerAccountA,
            tokenOwnerAccountB,
            tokenVaultA: whirlpool.tokenVaultA,
            tokenVaultB: whirlpool.tokenVaultB,
            tickArrayLower: public_1.PDAUtil.getTickArray(this.ctx.program.programId, this.data.whirlpool, public_1.TickUtil.getStartTickIndex(this.data.tickLowerIndex, whirlpool.tickSpacing)).publicKey,
            tickArrayUpper: public_1.PDAUtil.getTickArray(this.ctx.program.programId, this.data.whirlpool, public_1.TickUtil.getStartTickIndex(this.data.tickUpperIndex, whirlpool.tickSpacing)).publicKey,
            positionAuthority: positionWalletKey,
        };
        const decreaseIx = !token_extension_util_1.TokenExtensionUtil.isV2IxRequiredPool(tokenExtensionCtx)
            ? (0, instructions_1.decreaseLiquidityIx)(this.ctx.program, baseParams)
            : (0, instructions_1.decreaseLiquidityV2Ix)(this.ctx.program, {
                ...baseParams,
                tokenMintA: whirlpool.tokenMintA,
                tokenMintB: whirlpool.tokenMintB,
                tokenProgramA: tokenExtensionCtx.tokenMintWithProgramA.tokenProgram,
                tokenProgramB: tokenExtensionCtx.tokenMintWithProgramB.tokenProgram,
                ...(await token_extension_util_1.TokenExtensionUtil.getExtraAccountMetasForTransferHookForPool(this.ctx.connection, tokenExtensionCtx, baseParams.tokenVaultA, baseParams.tokenOwnerAccountA, baseParams.whirlpool, baseParams.tokenVaultB, baseParams.tokenOwnerAccountB, baseParams.whirlpool)),
            });
        txBuilder.addInstruction(decreaseIx);
        return txBuilder;
    }
    async collectFees(updateFeesAndRewards = true, ownerTokenAccountMap, destinationWallet, positionWallet, ataPayer, opts = fetcher_1.PREFER_CACHE) {
        const [destinationWalletKey, positionWalletKey, ataPayerKey] = common_sdk_1.AddressUtil.toPubKeys([
            destinationWallet ?? this.ctx.wallet.publicKey,
            positionWallet ?? this.ctx.wallet.publicKey,
            ataPayer ?? this.ctx.wallet.publicKey,
        ]);
        const whirlpool = await this.ctx.fetcher.getPool(this.data.whirlpool, opts);
        if (!whirlpool) {
            throw new Error(`Unable to fetch whirlpool (${this.data.whirlpool}) for this position (${this.address}).`);
        }
        const tokenExtensionCtx = await token_extension_util_1.TokenExtensionUtil.buildTokenExtensionContext(this.ctx.fetcher, whirlpool, fetcher_1.IGNORE_CACHE);
        let txBuilder = new common_sdk_1.TransactionBuilder(this.ctx.provider.connection, this.ctx.provider.wallet, this.ctx.txBuilderOpts);
        const accountExemption = await this.ctx.fetcher.getAccountRentExempt();
        let ataMap = { ...ownerTokenAccountMap };
        if (!ownerTokenAccountMap) {
            const affliatedMints = (0, whirlpool_ata_utils_1.getTokenMintsFromWhirlpools)([whirlpool], whirlpool_ata_utils_1.TokenMintTypes.POOL_ONLY);
            const { ataTokenAddresses: affliatedTokenAtaMap, resolveAtaIxs } = await (0, whirlpool_ata_utils_1.resolveAtaForMints)(this.ctx, {
                mints: affliatedMints.mintMap,
                accountExemption,
                receiver: destinationWalletKey,
                payer: ataPayerKey,
            });
            txBuilder.addInstructions(resolveAtaIxs);
            if (affliatedMints.hasNativeMint) {
                let { address: wSOLAta, ...resolveWSolIx } = common_sdk_1.TokenUtil.createWrappedNativeAccountInstruction(destinationWalletKey, common_sdk_1.ZERO, accountExemption, ataPayerKey, destinationWalletKey, this.ctx.accountResolverOpts.createWrappedSolAccountMethod);
                affliatedTokenAtaMap[spl_token_1.NATIVE_MINT.toBase58()] = wSOLAta;
                txBuilder.addInstruction(resolveWSolIx);
            }
            ataMap = { ...affliatedTokenAtaMap };
        }
        const tokenOwnerAccountA = ataMap[whirlpool.tokenMintA.toBase58()];
        (0, tiny_invariant_1.default)(!!tokenOwnerAccountA, `No owner token account provided for wallet ${destinationWalletKey.toBase58()} for token A ${whirlpool.tokenMintA.toBase58()} `);
        const tokenOwnerAccountB = ataMap[whirlpool.tokenMintB.toBase58()];
        (0, tiny_invariant_1.default)(!!tokenOwnerAccountB, `No owner token account provided for wallet ${destinationWalletKey.toBase58()} for token B ${whirlpool.tokenMintB.toBase58()} `);
        const positionTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(this.data.positionMint, positionWalletKey, this.ctx.accountResolverOpts.allowPDAOwnerAddress, this.positionMintTokenProgramId);
        if (updateFeesAndRewards && !this.data.liquidity.isZero()) {
            const updateIx = await this.updateFeesAndRewards();
            txBuilder.addInstruction(updateIx);
        }
        const baseParams = {
            whirlpool: this.data.whirlpool,
            position: this.address,
            positionTokenAccount,
            tokenOwnerAccountA: common_sdk_1.AddressUtil.toPubKey(tokenOwnerAccountA),
            tokenOwnerAccountB: common_sdk_1.AddressUtil.toPubKey(tokenOwnerAccountB),
            tokenVaultA: whirlpool.tokenVaultA,
            tokenVaultB: whirlpool.tokenVaultB,
            positionAuthority: positionWalletKey,
        };
        const ix = !token_extension_util_1.TokenExtensionUtil.isV2IxRequiredPool(tokenExtensionCtx)
            ? (0, instructions_1.collectFeesIx)(this.ctx.program, baseParams)
            : (0, instructions_1.collectFeesV2Ix)(this.ctx.program, {
                ...baseParams,
                tokenMintA: whirlpool.tokenMintA,
                tokenMintB: whirlpool.tokenMintB,
                tokenProgramA: tokenExtensionCtx.tokenMintWithProgramA.tokenProgram,
                tokenProgramB: tokenExtensionCtx.tokenMintWithProgramB.tokenProgram,
                ...(await token_extension_util_1.TokenExtensionUtil.getExtraAccountMetasForTransferHookForPool(this.ctx.connection, tokenExtensionCtx, baseParams.tokenVaultA, baseParams.tokenOwnerAccountA, baseParams.whirlpool, baseParams.tokenVaultB, baseParams.tokenOwnerAccountB, baseParams.whirlpool)),
            });
        txBuilder.addInstruction(ix);
        return txBuilder;
    }
    async collectRewards(rewardsToCollect, updateFeesAndRewards = true, ownerTokenAccountMap, destinationWallet, positionWallet, ataPayer, opts = fetcher_1.IGNORE_CACHE) {
        const [destinationWalletKey, positionWalletKey, ataPayerKey] = common_sdk_1.AddressUtil.toPubKeys([
            destinationWallet ?? this.ctx.wallet.publicKey,
            positionWallet ?? this.ctx.wallet.publicKey,
            ataPayer ?? this.ctx.wallet.publicKey,
        ]);
        const whirlpool = await this.ctx.fetcher.getPool(this.data.whirlpool, opts);
        if (!whirlpool) {
            throw new Error(`Unable to fetch whirlpool(${this.data.whirlpool}) for this position(${this.address}).`);
        }
        const initializedRewards = whirlpool.rewardInfos.filter((info) => public_1.PoolUtil.isRewardInitialized(info));
        const tokenExtensionCtx = await token_extension_util_1.TokenExtensionUtil.buildTokenExtensionContext(this.ctx.fetcher, whirlpool, fetcher_1.IGNORE_CACHE);
        let resolvedAtas;
        if (ownerTokenAccountMap) {
            resolvedAtas = {};
            Object.entries(ownerTokenAccountMap).forEach(([mint, address]) => {
                if (!address)
                    return;
                resolvedAtas[mint] = {
                    address: common_sdk_1.AddressUtil.toPubKey(address),
                    instructions: [],
                    cleanupInstructions: [],
                    signers: [],
                    tokenProgram: web3_js_1.PublicKey.default,
                };
            });
        }
        else {
            const accountExemption = await this.ctx.fetcher.getAccountRentExempt();
            const rewardMints = (0, whirlpool_ata_utils_1.getTokenMintsFromWhirlpools)([whirlpool], whirlpool_ata_utils_1.TokenMintTypes.REWARD_ONLY);
            resolvedAtas = (0, txn_utils_1.convertListToMap)(await (0, common_sdk_1.resolveOrCreateATAs)(this.ctx.connection, destinationWalletKey, rewardMints.mintMap.map((tokenMint) => ({ tokenMint })), async () => accountExemption, ataPayerKey, true, this.ctx.accountResolverOpts.allowPDAOwnerAddress), rewardMints.mintMap.map((mint) => mint.toBase58()));
        }
        const builder = new txn_utils_1.MultipleTransactionBuilderFactoryWithAccountResolver(this.ctx, resolvedAtas, destinationWalletKey, ataPayerKey);
        const positionTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(this.data.positionMint, positionWalletKey, this.ctx.accountResolverOpts.allowPDAOwnerAddress, this.positionMintTokenProgramId);
        if (updateFeesAndRewards && !this.data.liquidity.isZero()) {
            await builder.addInstructions(async () => {
                const updateIx = await this.updateFeesAndRewards();
                return [updateIx];
            });
        }
        for (let index = 0; index < initializedRewards.length; index++) {
            const info = initializedRewards[index];
            if (rewardsToCollect &&
                !rewardsToCollect.some((r) => r.toString() === info.mint.toBase58())) {
                break;
            }
            await builder.addInstructions(async (resolve) => {
                const rewardOwnerAccount = resolve(info.mint.toBase58());
                (0, tiny_invariant_1.default)(!!rewardOwnerAccount, `No owner token account provided for wallet ${destinationWalletKey.toBase58()} for reward ${index} token ${info.mint.toBase58()} `);
                const baseParams = {
                    whirlpool: this.data.whirlpool,
                    position: this.address,
                    positionTokenAccount,
                    rewardIndex: index,
                    rewardOwnerAccount: common_sdk_1.AddressUtil.toPubKey(rewardOwnerAccount),
                    rewardVault: info.vault,
                    positionAuthority: positionWalletKey,
                };
                const ix = !token_extension_util_1.TokenExtensionUtil.isV2IxRequiredReward(tokenExtensionCtx, index)
                    ? (0, instructions_1.collectRewardIx)(this.ctx.program, baseParams)
                    : (0, instructions_1.collectRewardV2Ix)(this.ctx.program, {
                        ...baseParams,
                        rewardMint: info.mint,
                        rewardTokenProgram: tokenExtensionCtx.rewardTokenMintsWithProgram[index]
                            .tokenProgram,
                        rewardTransferHookAccounts: await token_extension_util_1.TokenExtensionUtil.getExtraAccountMetasForTransferHook(this.ctx.connection, tokenExtensionCtx.rewardTokenMintsWithProgram[index], baseParams.rewardVault, baseParams.rewardOwnerAccount, baseParams.whirlpool),
                    });
                return [ix];
            });
        }
        return builder.build();
    }
    async refresh() {
        const positionAccount = await this.ctx.fetcher.getPosition(this.address, fetcher_1.IGNORE_CACHE);
        if (!!positionAccount) {
            this.data = positionAccount;
        }
        const whirlpoolAccount = await this.ctx.fetcher.getPool(this.data.whirlpool, fetcher_1.IGNORE_CACHE);
        if (!!whirlpoolAccount) {
            this.whirlpoolData = whirlpoolAccount;
        }
        const [lowerTickArray, upperTickArray] = await (0, position_builder_util_1.getTickArrayDataForPosition)(this.ctx, this.data, this.whirlpoolData, fetcher_1.IGNORE_CACHE);
        if (lowerTickArray) {
            this.lowerTickArrayData = lowerTickArray;
        }
        if (upperTickArray) {
            this.upperTickArrayData = upperTickArray;
        }
    }
    async updateFeesAndRewards() {
        const whirlpool = await this.ctx.fetcher.getPool(this.data.whirlpool);
        if (!whirlpool) {
            throw new Error(`Unable to fetch whirlpool(${this.data.whirlpool}) for this position(${this.address}).`);
        }
        const [tickArrayLowerPda, tickArrayUpperPda] = [
            this.data.tickLowerIndex,
            this.data.tickUpperIndex,
        ].map((tickIndex) => public_1.PDAUtil.getTickArrayFromTickIndex(tickIndex, whirlpool.tickSpacing, this.data.whirlpool, this.ctx.program.programId));
        const updateIx = (0, instructions_1.updateFeesAndRewardsIx)(this.ctx.program, {
            whirlpool: this.data.whirlpool,
            position: this.address,
            tickArrayLower: tickArrayLowerPda.publicKey,
            tickArrayUpper: tickArrayUpperPda.publicKey,
        });
        return updateIx;
    }
}
exports.PositionImpl = PositionImpl;
//# sourceMappingURL=position-impl.js.map