"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhirlpoolAccountFetcher = exports.buildDefaultAccountFetcher = void 0;
const common_sdk_1 = require("@orca-so/common-sdk");
const spl_token_1 = require("@solana/spl-token");
const __1 = require("..");
const parsing_1 = require("../parsing");
const buildDefaultAccountFetcher = (connection) => {
    return new WhirlpoolAccountFetcher(connection, new common_sdk_1.SimpleAccountFetcher(connection, __1.DEFAULT_WHIRLPOOL_RETENTION_POLICY));
};
exports.buildDefaultAccountFetcher = buildDefaultAccountFetcher;
class WhirlpoolAccountFetcher {
    connection;
    fetcher;
    _accountRentExempt;
    _epochInfo;
    _epochInfoNextFetchTime = 0;
    constructor(connection, fetcher) {
        this.connection = connection;
        this.fetcher = fetcher;
    }
    async getAccountRentExempt(refresh = false) {
        if (!this._accountRentExempt || refresh) {
            this._accountRentExempt =
                await this.connection.getMinimumBalanceForRentExemption(spl_token_1.AccountLayout.span);
        }
        return this._accountRentExempt;
    }
    async getEpoch(refresh = false) {
        if (!this._epochInfo ||
            Date.now() >= this._epochInfoNextFetchTime ||
            refresh) {
            const epochInfo = await this.connection.getEpochInfo();
            const remainingSlotsInEpoch = Math.max(epochInfo.slotsInEpoch - epochInfo.slotIndex, 0);
            const nextFetchTime = Date.now() + remainingSlotsInEpoch * 320;
            this._epochInfo = epochInfo;
            this._epochInfoNextFetchTime = nextFetchTime;
        }
        return this._epochInfo.epoch;
    }
    getPool(address, opts) {
        return this.fetcher.getAccount(address, parsing_1.ParsableWhirlpool, opts);
    }
    getPools(addresses, opts) {
        return this.fetcher.getAccounts(addresses, parsing_1.ParsableWhirlpool, opts);
    }
    getPosition(address, opts) {
        return this.fetcher.getAccount(address, parsing_1.ParsablePosition, opts);
    }
    getPositions(addresses, opts) {
        return this.fetcher.getAccounts(addresses, parsing_1.ParsablePosition, opts);
    }
    getTickArray(address, opts) {
        return this.fetcher.getAccount(address, parsing_1.ParsableTickArray, opts);
    }
    getTickArrays(addresses, opts) {
        return this.fetcher.getAccountsAsArray(addresses, parsing_1.ParsableTickArray, opts);
    }
    getFeeTier(address, opts) {
        return this.fetcher.getAccount(address, parsing_1.ParsableFeeTier, opts);
    }
    getFeeTiers(addresses, opts) {
        return this.fetcher.getAccounts(addresses, parsing_1.ParsableFeeTier, opts);
    }
    getTokenInfo(address, opts) {
        return this.fetcher.getAccount(address, common_sdk_1.ParsableTokenAccountInfo, opts);
    }
    getTokenInfos(addresses, opts) {
        return this.fetcher.getAccounts(addresses, common_sdk_1.ParsableTokenAccountInfo, opts);
    }
    getMintInfo(address, opts) {
        return this.fetcher.getAccount(address, common_sdk_1.ParsableMintInfo, opts);
    }
    getMintInfos(addresses, opts) {
        return this.fetcher.getAccounts(addresses, common_sdk_1.ParsableMintInfo, opts);
    }
    getConfig(address, opts) {
        return this.fetcher.getAccount(address, parsing_1.ParsableWhirlpoolsConfig, opts);
    }
    getConfigs(addresses, opts) {
        return this.fetcher.getAccounts(addresses, parsing_1.ParsableWhirlpoolsConfig, opts);
    }
    getPositionBundle(address, opts) {
        return this.fetcher.getAccount(address, parsing_1.ParsablePositionBundle, opts);
    }
    getPositionBundles(addresses, opts) {
        return this.fetcher.getAccounts(addresses, parsing_1.ParsablePositionBundle, opts);
    }
    getConfigExtension(address, opts) {
        return this.fetcher.getAccount(address, parsing_1.ParsableWhirlpoolsConfigExtension, opts);
    }
    getConfigExtensions(addresses, opts) {
        return this.fetcher.getAccounts(addresses, parsing_1.ParsableWhirlpoolsConfigExtension, opts);
    }
    getTokenBadge(address, opts) {
        return this.fetcher.getAccount(address, parsing_1.ParsableTokenBadge, opts);
    }
    getTokenBadges(addresses, opts) {
        return this.fetcher.getAccounts(addresses, parsing_1.ParsableTokenBadge, opts);
    }
    populateCache(accounts, parser, now = Date.now()) {
        this.fetcher.populateAccounts(accounts, parser, now);
    }
}
exports.WhirlpoolAccountFetcher = WhirlpoolAccountFetcher;
//# sourceMappingURL=fetcher-impl.js.map