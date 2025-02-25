import type { Program } from "@coral-xyz/anchor";
import type { AccountMeta, PublicKey } from "@solana/web3.js";
import type { Whirlpool } from "../../artifacts/whirlpool";
import type { Instruction } from "@orca-so/common-sdk";
export type CollectFeesV2Params = {
    whirlpool: PublicKey;
    position: PublicKey;
    positionTokenAccount: PublicKey;
    positionAuthority: PublicKey;
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
};
export declare function collectFeesV2Ix(program: Program<Whirlpool>, params: CollectFeesV2Params): Instruction;
