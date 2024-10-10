"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPLASH_POOL_TICK_SPACING = exports.FULL_RANGE_ONLY_TICK_SPACING_THRESHOLD = exports.WHIRLPOOL_NFT_UPDATE_AUTH = exports.FEE_RATE_MUL_VALUE = exports.PROTOCOL_FEE_RATE_MUL_VALUE = exports.MAX_SUPPLEMENTAL_TICK_ARRAYS = exports.MAX_SWAP_TICK_ARRAYS = exports.MEMO_PROGRAM_ADDRESS = exports.METADATA_PROGRAM_ADDRESS = exports.POSITION_BUNDLE_SIZE = exports.TICK_ARRAY_SIZE = exports.MAX_SQRT_PRICE_BN = exports.MIN_SQRT_PRICE_BN = exports.MIN_SQRT_PRICE = exports.MAX_SQRT_PRICE = exports.MIN_TICK_INDEX = exports.MAX_TICK_INDEX = exports.NUM_REWARDS = exports.ORCA_SUPPORTED_TICK_SPACINGS = exports.ORCA_WHIRLPOOLS_CONFIG_EXTENSION = exports.ORCA_WHIRLPOOLS_CONFIG = exports.ORCA_WHIRLPOOL_PROGRAM_ID = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
exports.ORCA_WHIRLPOOL_PROGRAM_ID = new web3_js_1.PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");
exports.ORCA_WHIRLPOOLS_CONFIG = new web3_js_1.PublicKey("2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ");
exports.ORCA_WHIRLPOOLS_CONFIG_EXTENSION = new web3_js_1.PublicKey("777H5H3Tp9U11uRVRzFwM8BinfiakbaLT8vQpeuhvEiH");
exports.ORCA_SUPPORTED_TICK_SPACINGS = [
    1, 2, 4, 8, 16, 64, 96, 128, 256, 32896,
];
exports.NUM_REWARDS = 3;
exports.MAX_TICK_INDEX = 443636;
exports.MIN_TICK_INDEX = -443636;
exports.MAX_SQRT_PRICE = "79226673515401279992447579055";
exports.MIN_SQRT_PRICE = "4295048016";
exports.MIN_SQRT_PRICE_BN = new anchor_1.BN(exports.MIN_SQRT_PRICE);
exports.MAX_SQRT_PRICE_BN = new anchor_1.BN(exports.MAX_SQRT_PRICE);
exports.TICK_ARRAY_SIZE = 88;
exports.POSITION_BUNDLE_SIZE = 256;
exports.METADATA_PROGRAM_ADDRESS = new web3_js_1.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
exports.MEMO_PROGRAM_ADDRESS = new web3_js_1.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
exports.MAX_SWAP_TICK_ARRAYS = 3;
exports.MAX_SUPPLEMENTAL_TICK_ARRAYS = 3;
exports.PROTOCOL_FEE_RATE_MUL_VALUE = new anchor_1.BN(10_000);
exports.FEE_RATE_MUL_VALUE = new anchor_1.BN(1_000_000);
exports.WHIRLPOOL_NFT_UPDATE_AUTH = new web3_js_1.PublicKey("3axbTs2z5GBy6usVbNVoqEgZMng3vZvMnAoX29BFfwhr");
exports.FULL_RANGE_ONLY_TICK_SPACING_THRESHOLD = 32768;
exports.SPLASH_POOL_TICK_SPACING = 32896;
//# sourceMappingURL=constants.js.map