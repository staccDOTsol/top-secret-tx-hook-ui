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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhirlpoolIx = void 0;
const ix = __importStar(require("./instructions"));
class WhirlpoolIx {
    static initializeConfigIx(program, params) {
        return ix.initializeConfigIx(program, params);
    }
    static initializeFeeTierIx(program, params) {
        return ix.initializeFeeTierIx(program, params);
    }
    static initializePoolIx(program, params) {
        return ix.initializePoolIx(program, params);
    }
    static initializeRewardIx(program, params) {
        return ix.initializeRewardIx(program, params);
    }
    static initTickArrayIx(program, params) {
        return ix.initTickArrayIx(program, params);
    }
    static openPositionIx(program, params) {
        return ix.openPositionIx(program, params);
    }
    static openPositionWithMetadataIx(program, params) {
        return ix.openPositionWithMetadataIx(program, params);
    }
    static increaseLiquidityIx(program, params) {
        return ix.increaseLiquidityIx(program, params);
    }
    static decreaseLiquidityIx(program, params) {
        return ix.decreaseLiquidityIx(program, params);
    }
    static closePositionIx(program, params) {
        return ix.closePositionIx(program, params);
    }
    static swapIx(program, params) {
        return ix.swapIx(program, params);
    }
    static twoHopSwapIx(program, params) {
        return ix.twoHopSwapIx(program, params);
    }
    static updateFeesAndRewardsIx(program, params) {
        return ix.updateFeesAndRewardsIx(program, params);
    }
    static collectFeesIx(program, params) {
        return ix.collectFeesIx(program, params);
    }
    static collectProtocolFeesIx(program, params) {
        return ix.collectProtocolFeesIx(program, params);
    }
    static collectRewardIx(program, params) {
        return ix.collectRewardIx(program, params);
    }
    static setCollectProtocolFeesAuthorityIx(program, params) {
        return ix.setCollectProtocolFeesAuthorityIx(program, params);
    }
    static setDefaultFeeRateIx(program, params) {
        return ix.setDefaultFeeRateIx(program, params);
    }
    static setDefaultProtocolFeeRateIx(program, params) {
        return ix.setDefaultProtocolFeeRateIx(program, params);
    }
    static setFeeAuthorityIx(program, params) {
        return ix.setFeeAuthorityIx(program, params);
    }
    static setFeeRateIx(program, params) {
        return ix.setFeeRateIx(program, params);
    }
    static setProtocolFeeRateIx(program, params) {
        return ix.setProtocolFeeRateIx(program, params);
    }
    static setRewardAuthorityBySuperAuthorityIx(program, params) {
        return ix.setRewardAuthorityBySuperAuthorityIx(program, params);
    }
    static setRewardAuthorityIx(program, params) {
        return ix.setRewardAuthorityIx(program, params);
    }
    static setRewardEmissionsIx(program, params) {
        return ix.setRewardEmissionsIx(program, params);
    }
    static setRewardEmissionsSuperAuthorityIx(program, params) {
        return ix.setRewardEmissionsSuperAuthorityIx(program, params);
    }
    static initializePositionBundleIx(program, params) {
        return ix.initializePositionBundleIx(program, params);
    }
    static initializePositionBundleWithMetadataIx(program, params) {
        return ix.initializePositionBundleWithMetadataIx(program, params);
    }
    static deletePositionBundleIx(program, params) {
        return ix.deletePositionBundleIx(program, params);
    }
    static openBundledPositionIx(program, params) {
        return ix.openBundledPositionIx(program, params);
    }
    static closeBundledPositionIx(program, params) {
        return ix.closeBundledPositionIx(program, params);
    }
    static openPositionWithTokenExtensionsIx(program, params) {
        return ix.openPositionWithTokenExtensionsIx(program, params);
    }
    static closePositionWithTokenExtensionsIx(program, params) {
        return ix.closePositionWithTokenExtensionsIx(program, params);
    }
    static collectFeesV2Ix(program, params) {
        return ix.collectFeesV2Ix(program, params);
    }
    static collectProtocolFeesV2Ix(program, params) {
        return ix.collectProtocolFeesV2Ix(program, params);
    }
    static collectRewardV2Ix(program, params) {
        return ix.collectRewardV2Ix(program, params);
    }
    static decreaseLiquidityV2Ix(program, params) {
        return ix.decreaseLiquidityV2Ix(program, params);
    }
    static increaseLiquidityV2Ix(program, params) {
        return ix.increaseLiquidityV2Ix(program, params);
    }
    static initializePoolV2Ix(program, params) {
        return ix.initializePoolV2Ix(program, params);
    }
    static initializeRewardV2Ix(program, params) {
        return ix.initializeRewardV2Ix(program, params);
    }
    static setRewardEmissionsV2Ix(program, params) {
        return ix.setRewardEmissionsV2Ix(program, params);
    }
    static swapV2Ix(program, params) {
        return ix.swapV2Ix(program, params);
    }
    static twoHopSwapV2Ix(program, params) {
        return ix.twoHopSwapV2Ix(program, params);
    }
    static initializeConfigExtensionIx(program, params) {
        return ix.initializeConfigExtensionIx(program, params);
    }
    static setConfigExtensionAuthorityIx(program, params) {
        return ix.setConfigExtensionAuthorityIx(program, params);
    }
    static setTokenBadgeAuthorityIx(program, params) {
        return ix.setTokenBadgeAuthorityIx(program, params);
    }
    static initializeTokenBadgeIx(program, params) {
        return ix.initializeTokenBadgeIx(program, params);
    }
    static deleteTokenBadgeIx(program, params) {
        return ix.deleteTokenBadgeIx(program, params);
    }
}
exports.WhirlpoolIx = WhirlpoolIx;
//# sourceMappingURL=ix.js.map