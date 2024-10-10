"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WHIRLPOOL_ACCOUNT_SIZE = exports.WHIRLPOOL_CODER = exports.WHIRLPOOL_IDL = exports.AccountName = void 0;
exports.getAccountSize = getAccountSize;
const anchor_1 = require("@coral-xyz/anchor");
const whirlpool_json_1 = __importDefault(require("../../artifacts/whirlpool.json"));
var AccountName;
(function (AccountName) {
    AccountName["WhirlpoolsConfig"] = "WhirlpoolsConfig";
    AccountName["Position"] = "Position";
    AccountName["TickArray"] = "TickArray";
    AccountName["Whirlpool"] = "Whirlpool";
    AccountName["FeeTier"] = "FeeTier";
    AccountName["PositionBundle"] = "PositionBundle";
    AccountName["WhirlpoolsConfigExtension"] = "WhirlpoolsConfigExtension";
    AccountName["TokenBadge"] = "TokenBadge";
})(AccountName || (exports.AccountName = AccountName = {}));
exports.WHIRLPOOL_IDL = whirlpool_json_1.default;
exports.WHIRLPOOL_CODER = new anchor_1.BorshAccountsCoder(exports.WHIRLPOOL_IDL);
function getAccountSize(accountName) {
    const size = exports.WHIRLPOOL_CODER.size(exports.WHIRLPOOL_IDL.accounts.find((account) => account.name === accountName));
    return size + RESERVED_BYTES[accountName];
}
const RESERVED_BYTES = {
    [AccountName.WhirlpoolsConfig]: 2,
    [AccountName.Position]: 0,
    [AccountName.TickArray]: 0,
    [AccountName.Whirlpool]: 0,
    [AccountName.FeeTier]: 0,
    [AccountName.PositionBundle]: 64,
    [AccountName.WhirlpoolsConfigExtension]: 512,
    [AccountName.TokenBadge]: 128,
};
exports.WHIRLPOOL_ACCOUNT_SIZE = getAccountSize(AccountName.Whirlpool);
//# sourceMappingURL=anchor-types.js.map