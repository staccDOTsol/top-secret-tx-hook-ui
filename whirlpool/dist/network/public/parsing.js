"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParsableTokenBadge = exports.ParsableWhirlpoolsConfigExtension = exports.ParsablePositionBundle = exports.ParsableFeeTier = exports.ParsableTickArray = exports.ParsablePosition = exports.ParsableWhirlpool = exports.ParsableWhirlpoolsConfig = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const common_sdk_1 = require("@orca-so/common-sdk");
const WhirlpoolIDL = __importStar(require("../../artifacts/whirlpool.json"));
const public_1 = require("../../types/public");
let ParsableWhirlpoolsConfig = class ParsableWhirlpoolsConfig {
    static parse(address, accountData) {
        if (!accountData?.data) {
            return null;
        }
        try {
            return parseAnchorAccount(public_1.AccountName.WhirlpoolsConfig, accountData);
        }
        catch (e) {
            console.error(`error while parsing WhirlpoolsConfig: ${e}`);
            return null;
        }
    }
};
exports.ParsableWhirlpoolsConfig = ParsableWhirlpoolsConfig;
exports.ParsableWhirlpoolsConfig = ParsableWhirlpoolsConfig = __decorate([
    (0, common_sdk_1.staticImplements)()
], ParsableWhirlpoolsConfig);
let ParsableWhirlpool = class ParsableWhirlpool {
    static parse(address, accountData) {
        if (!accountData?.data) {
            return null;
        }
        try {
            return parseAnchorAccount(public_1.AccountName.Whirlpool, accountData);
        }
        catch (e) {
            console.error(`error while parsing Whirlpool: ${e}`);
            return null;
        }
    }
};
exports.ParsableWhirlpool = ParsableWhirlpool;
exports.ParsableWhirlpool = ParsableWhirlpool = __decorate([
    (0, common_sdk_1.staticImplements)()
], ParsableWhirlpool);
let ParsablePosition = class ParsablePosition {
    static parse(address, accountData) {
        if (!accountData?.data) {
            return null;
        }
        try {
            return parseAnchorAccount(public_1.AccountName.Position, accountData);
        }
        catch (e) {
            console.error(`error while parsing Position: ${e}`);
            return null;
        }
    }
};
exports.ParsablePosition = ParsablePosition;
exports.ParsablePosition = ParsablePosition = __decorate([
    (0, common_sdk_1.staticImplements)()
], ParsablePosition);
let ParsableTickArray = class ParsableTickArray {
    static parse(address, accountData) {
        if (!accountData?.data) {
            return null;
        }
        try {
            return parseAnchorAccount(public_1.AccountName.TickArray, accountData);
        }
        catch (e) {
            console.error(`error while parsing TickArray: ${e}`);
            return null;
        }
    }
};
exports.ParsableTickArray = ParsableTickArray;
exports.ParsableTickArray = ParsableTickArray = __decorate([
    (0, common_sdk_1.staticImplements)()
], ParsableTickArray);
let ParsableFeeTier = class ParsableFeeTier {
    static parse(address, accountData) {
        if (!accountData?.data) {
            return null;
        }
        try {
            return parseAnchorAccount(public_1.AccountName.FeeTier, accountData);
        }
        catch (e) {
            console.error(`error while parsing FeeTier: ${e}`);
            return null;
        }
    }
};
exports.ParsableFeeTier = ParsableFeeTier;
exports.ParsableFeeTier = ParsableFeeTier = __decorate([
    (0, common_sdk_1.staticImplements)()
], ParsableFeeTier);
let ParsablePositionBundle = class ParsablePositionBundle {
    static parse(address, accountData) {
        if (!accountData?.data) {
            return null;
        }
        try {
            return parseAnchorAccount(public_1.AccountName.PositionBundle, accountData);
        }
        catch (e) {
            console.error(`error while parsing PositionBundle: ${e}`);
            return null;
        }
    }
};
exports.ParsablePositionBundle = ParsablePositionBundle;
exports.ParsablePositionBundle = ParsablePositionBundle = __decorate([
    (0, common_sdk_1.staticImplements)()
], ParsablePositionBundle);
let ParsableWhirlpoolsConfigExtension = class ParsableWhirlpoolsConfigExtension {
    static parse(address, accountData) {
        if (!accountData?.data) {
            return null;
        }
        try {
            return parseAnchorAccount(public_1.AccountName.WhirlpoolsConfigExtension, accountData);
        }
        catch (e) {
            console.error(`error while parsing WhirlpoolsConfigExtension: ${e}`);
            return null;
        }
    }
};
exports.ParsableWhirlpoolsConfigExtension = ParsableWhirlpoolsConfigExtension;
exports.ParsableWhirlpoolsConfigExtension = ParsableWhirlpoolsConfigExtension = __decorate([
    (0, common_sdk_1.staticImplements)()
], ParsableWhirlpoolsConfigExtension);
let ParsableTokenBadge = class ParsableTokenBadge {
    static parse(address, accountData) {
        if (!accountData?.data) {
            return null;
        }
        try {
            return parseAnchorAccount(public_1.AccountName.TokenBadge, accountData);
        }
        catch (e) {
            console.error(`error while parsing TokenBadge: ${e}`);
            return null;
        }
    }
};
exports.ParsableTokenBadge = ParsableTokenBadge;
exports.ParsableTokenBadge = ParsableTokenBadge = __decorate([
    (0, common_sdk_1.staticImplements)()
], ParsableTokenBadge);
const WhirlpoolCoder = new anchor_1.BorshAccountsCoder(WhirlpoolIDL);
function parseAnchorAccount(accountName, accountData) {
    const data = accountData.data;
    const discriminator = anchor_1.BorshAccountsCoder.accountDiscriminator(accountName);
    if (discriminator.compare(data.slice(0, 8))) {
        console.error("incorrect account name during parsing");
        return null;
    }
    try {
        return WhirlpoolCoder.decode(accountName, data);
    }
    catch (_e) {
        console.error("unknown account name during parsing");
        return null;
    }
}
//# sourceMappingURL=parsing.js.map