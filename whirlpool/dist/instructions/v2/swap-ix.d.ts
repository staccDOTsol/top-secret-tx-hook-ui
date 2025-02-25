import type { Program } from "@coral-xyz/anchor";
import type { Instruction } from "@orca-so/common-sdk";
import type { AccountMeta, PublicKey } from "@solana/web3.js";
import type { Whirlpool } from "../../artifacts/whirlpool";
import type { SwapInput } from "../../types/public";
export type SwapV2Params = SwapInput & {
    whirlpool: PublicKey;
    tokenMintA: PublicKey;
    tokenMintB: PublicKey;
    tokenOwnerAccountA: PublicKey;
    tokenOwnerAccountB: PublicKey;
    tokenVaultA: PublicKey;
    tokenVaultB: PublicKey;
    tokenTransferHookAccountsA?: AccountMeta[];
    tokenTransferHookAccountsB?: AccountMeta[];
    tokenProgramA: PublicKey;
    tokenProgramB: PublicKey;
    oracle: PublicKey;
    tokenAuthority: PublicKey;
};
export declare function swapV2Ix(program: Program<Whirlpool>, params: SwapV2Params): Instruction;
