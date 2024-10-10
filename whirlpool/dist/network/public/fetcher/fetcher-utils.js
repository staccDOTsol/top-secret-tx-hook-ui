"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllWhirlpoolAccountsForConfig = getAllWhirlpoolAccountsForConfig;
exports.getAllPositionAccountsByOwner = getAllPositionAccountsByOwner;
const common_sdk_1 = require("@orca-so/common-sdk");
const tiny_invariant_1 = __importDefault(require("tiny-invariant"));
const public_1 = require("../../../types/public");
const parsing_1 = require("../parsing");
const spl_token_1 = require("@solana/spl-token");
const public_2 = require("../../../utils/public");
const __1 = require("../../..");
async function getAllWhirlpoolAccountsForConfig({ connection, programId, configId, }) {
    const filters = [
        { dataSize: (0, public_1.getAccountSize)(public_1.AccountName.Whirlpool) },
        {
            memcmp: public_1.WHIRLPOOL_CODER.memcmp(public_1.AccountName.Whirlpool, common_sdk_1.AddressUtil.toPubKey(configId).toBuffer()),
        },
    ];
    const accounts = await connection.getProgramAccounts(common_sdk_1.AddressUtil.toPubKey(programId), {
        filters,
    });
    const parsedAccounts = [];
    accounts.forEach(({ pubkey, account }) => {
        const parsedAccount = parsing_1.ParsableWhirlpool.parse(pubkey, account);
        (0, tiny_invariant_1.default)(!!parsedAccount, `could not parse whirlpool: ${pubkey.toBase58()}`);
        parsedAccounts.push([common_sdk_1.AddressUtil.toString(pubkey), parsedAccount]);
    });
    return new Map(parsedAccounts.map(([address, pool]) => [
        common_sdk_1.AddressUtil.toString(address),
        pool,
    ]));
}
async function getAllPositionAccountsByOwner({ ctx, owner, includesPositions = true, includesPositionsWithTokenExtensions = true, includesBundledPositions = false, }) {
    const positions = !includesPositions
        ? new Map()
        : await findPositions(ctx, owner, spl_token_1.TOKEN_PROGRAM_ID);
    const positionsWithTokenExtensions = !includesPositionsWithTokenExtensions
        ? new Map()
        : await findPositions(ctx, owner, spl_token_1.TOKEN_2022_PROGRAM_ID);
    const positionBundles = !includesBundledPositions
        ? []
        : await findBundledPositions(ctx, owner);
    return {
        positions,
        positionsWithTokenExtensions,
        positionBundles,
    };
}
async function findPositions(ctx, owner, tokenProgramId) {
    const programId = common_sdk_1.AddressUtil.toPubKey(tokenProgramId);
    const tokenAccounts = await ctx.connection.getTokenAccountsByOwner(common_sdk_1.AddressUtil.toPubKey(owner), {
        programId,
    });
    const candidatePubkeys = [];
    tokenAccounts.value.forEach((ta) => {
        const parsed = (0, spl_token_1.unpackAccount)(ta.pubkey, ta.account, programId);
        if (parsed.amount === 1n) {
            const pda = public_2.PDAUtil.getPosition(ctx.program.programId, parsed.mint);
            candidatePubkeys.push(pda.publicKey);
        }
    });
    const positionData = await ctx.fetcher.getPositions(candidatePubkeys, __1.IGNORE_CACHE);
    return new Map(Array.from(positionData.entries())
        .filter(([_, v]) => v !== null));
}
async function findBundledPositions(ctx, owner) {
    const tokenAccounts = await ctx.connection.getTokenAccountsByOwner(common_sdk_1.AddressUtil.toPubKey(owner), {
        programId: spl_token_1.TOKEN_PROGRAM_ID
    });
    const candidatePubkeys = [];
    tokenAccounts.value.forEach((ta) => {
        const parsed = (0, spl_token_1.unpackAccount)(ta.pubkey, ta.account, spl_token_1.TOKEN_PROGRAM_ID);
        if (parsed.amount === 1n) {
            const pda = public_2.PDAUtil.getPositionBundle(ctx.program.programId, parsed.mint);
            candidatePubkeys.push(pda.publicKey);
        }
    });
    const positionBundleData = await ctx.fetcher.getPositionBundles(candidatePubkeys, __1.IGNORE_CACHE);
    const positionBundles = Array.from(positionBundleData.entries())
        .filter(([_, v]) => v !== null);
    const bundledPositionPubkeys = [];
    positionBundles.forEach(([_, positionBundle]) => {
        const bundleIndexes = public_2.PositionBundleUtil.getOccupiedBundleIndexes(positionBundle);
        bundleIndexes.forEach((bundleIndex) => {
            const pda = public_2.PDAUtil.getBundledPosition(ctx.program.programId, positionBundle.positionBundleMint, bundleIndex);
            bundledPositionPubkeys.push(pda.publicKey);
        });
    });
    const bundledPositionData = await ctx.fetcher.getPositions(bundledPositionPubkeys, __1.IGNORE_CACHE);
    return positionBundles.map(([positionBundleAddress, positionBundleData]) => {
        const bundleIndexes = public_2.PositionBundleUtil.getOccupiedBundleIndexes(positionBundleData);
        const bundledPositions = new Map(bundleIndexes
            .map((bundleIndex) => {
            const pda = public_2.PDAUtil.getBundledPosition(ctx.program.programId, positionBundleData.positionBundleMint, bundleIndex);
            return [bundleIndex, bundledPositionData.get(common_sdk_1.AddressUtil.toString(pda.publicKey))];
        })
            .filter(([_, v]) => v !== null));
        return {
            positionBundleAddress,
            positionBundleData,
            bundledPositions,
        };
    });
}
//# sourceMappingURL=fetcher-utils.js.map