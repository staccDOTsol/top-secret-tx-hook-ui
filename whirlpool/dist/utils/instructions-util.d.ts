import * as anchor from "@coral-xyz/anchor";
import type { OpenPositionParams, OpenPositionWithTokenExtensionsParams } from "../instructions";
export declare function openPositionAccounts(params: OpenPositionParams): {
    funder: anchor.web3.PublicKey;
    owner: anchor.web3.PublicKey;
    position: anchor.web3.PublicKey;
    positionMint: anchor.web3.PublicKey;
    positionTokenAccount: anchor.web3.PublicKey;
    whirlpool: anchor.web3.PublicKey;
    tokenProgram: anchor.web3.PublicKey;
    systemProgram: anchor.web3.PublicKey;
    rent: anchor.web3.PublicKey;
    associatedTokenProgram: anchor.web3.PublicKey;
};
export declare function openPositionWithTokenExtensionsAccounts(params: OpenPositionWithTokenExtensionsParams): {
    funder: anchor.web3.PublicKey;
    owner: anchor.web3.PublicKey;
    position: anchor.web3.PublicKey;
    positionMint: anchor.web3.PublicKey;
    positionTokenAccount: anchor.web3.PublicKey;
    whirlpool: anchor.web3.PublicKey;
    token2022Program: anchor.web3.PublicKey;
    systemProgram: anchor.web3.PublicKey;
    associatedTokenProgram: anchor.web3.PublicKey;
};
