import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenContract } from "../target/types/token_contract";
import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
} from "@solana/spl-token";
import { PublicKey, clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, Transaction, SYSVAR_RENT_PUBKEY, MAX_SEED_LENGTH, sendAndConfirmTransaction } from '@solana/web3.js';
import { assert, use } from "chai";
import { balc, bn, getPdaKB, lam } from "../utils";
//import assert from "assert";

//TODO: add validation to check user credentials
const lg = console.log;
const { SystemProgram } = anchor.web3;

describe("token-contract", () => {
  const provider = anchor.AnchorProvider.local();
  //const provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);
  const auth = provider.wallet.publicKey;

  const program = anchor.workspace.TokenContract as Program<TokenContract>;

  const mintKP = anchor.web3.Keypair.generate();//represents the new token
  const amountToMint = 1000;
  const amountToTransfer = 123;
  let amount = 0;
  let ata: PublicKey;// AssociatedTokenAccount for anchor's workspace wallet

  it("transfer_lamports_to_pda", async () => {
    const { ukey: userPdaUkey, bump: userPdaBump } = getPdaKB("userpda", auth, program.programId)
    lg("ukey:", userPdaUkey.toBase58(), ', bump:', userPdaBump);

    let amountSol = 3;
    let amount = lam(amountSol)
    let tx = await program.methods
      .transferLamportsToNewPda(amount)
      .accounts({
        userPda: userPdaUkey,
        auth,
        systemProgram: SystemProgram.programId,
      }).rpc();
    lg("transferLamportsToPda tx:", tx);
    //await program.provider.connection.sendTransaction(transaction, [mintKP])
    let userPdaAcctInfo = await program.provider.connection.getAccountInfo(userPdaUkey)
    lg("userPdaAcctInfo:", userPdaAcctInfo)
    if (userPdaAcctInfo) {
      lg("userPdaUkey is generated. owner:", userPdaAcctInfo.owner.toString());
    }
    assert(userPdaAcctInfo.owner.equals(program.programId))
    //const userPdaBalcSol = await program.provider.connection.getBalance(userPdaUkey);
    lg('userPdaBalcSol:', userPdaAcctInfo.lamports)

    let userPda = await program.account.userPda.fetch(userPdaUkey);
    lg('deposit:', userPda.deposit.toNumber())
    assert(userPda.deposit.eq(amount));
  });

  it("transfer_lamports_from_pda", async () => {
    const { ukey: userPdaUkey, bump: userPdaBump } = getPdaKB("userpda", auth, program.programId)
    lg("ukey:", userPdaUkey.toBase58(), ', bump:', userPdaBump);

    lg("201");
    let amountSol = 1;
    let amount = lam(amountSol)
    const tx = await program.methods
      .transferLamportsFromPda(amount, userPdaBump)
      .accounts({
        userPda: userPdaUkey,
        auth,
        systemProgram: SystemProgram.programId,
      }).rpc();
    lg("transferLamportsFromPda tx:", tx);

    const userPdaAcctInfo = await program.provider.connection.getAccountInfo(userPdaUkey)
    lg("userPdaAcctInfo:", userPdaAcctInfo)
    if (userPdaAcctInfo) {
      lg("userPda owner:", userPdaAcctInfo.owner.toString());
    }
    assert(userPdaAcctInfo.owner.equals(program.programId))
    //const userPdaBalcSol = await program.provider.connection.getBalance(userPdaUkey);
    lg('userPdaBalcSol:', userPdaAcctInfo.lamports)

    const userPda = await program.account.userPda.fetch(userPdaUkey);
    lg('deposit:', userPda.deposit.toNumber())
    assert(userPda.deposit.eq(lam(2)));
  });

  it("Mint a token", async () => {
    const lamports: number = await program.provider.connection.getMinimumBalanceForRentExemption(
      MINT_SIZE
    );//to pay for rent

    // Get the AssociatedTokenAccount(ATA) for a token and the account that we want to own the ATA (but it might not existing on the SOL network yet)
    ata = await getAssociatedTokenAddress(
      mintKP.publicKey,
      auth
    );

    // Fires a list of instructions
    const mint_tx = new anchor.web3.Transaction().add(
      // Use anchor to create an account from the mint key that we created
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: auth,//transferring SOL from this
        newAccountPubkey: mintKP.publicKey,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,//owner of the new account
        lamports,
      }),
      // Fire a transaction to create our mint account that is controlled by our anchor wallet
      createInitializeMintInstruction(
        mintKP.publicKey, 0, auth, auth
      ),
      // Create the ATA account that is associated with our mint on our anchor wallet
      createAssociatedTokenAccountInstruction(
        auth, ata, auth, mintKP.publicKey
      )
    );

    // sends and create the transaction
    const res = await provider.sendAndConfirm(mint_tx, [mintKP]);
    lg("res: ", res);
    lg("Mint key: ", mintKP.publicKey.toString());
    lg("Auth: ", auth.toString());

    await balc(provider, mintKP.publicKey, 'mintKP.pubk', 1)

    await program.methods.mintToken(amountToMint).accounts({
      mint: mintKP.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenAccount: ata,
      authority: auth,
    }).rpc();

    amount = await balc(provider, ata, 'ata', 1)
    assert.equal(amount, amountToMint);
  });

  it("Transfer token", async () => {

    const receiverKP: anchor.web3.Keypair = anchor.web3.Keypair.generate();
    // The ATA for a token on the to wallet (but might not exist yet)
    const receiverAta = await getAssociatedTokenAddress(
      mintKP.publicKey,
      receiverKP.publicKey
    );

    // Fires a list of instructions
    const mint_tx = new anchor.web3.Transaction().add(
      // Create the ATA account that is associated with our To wallet
      createAssociatedTokenAccountInstruction(
        auth, receiverAta, receiverKP.publicKey, mintKP.publicKey
      )
    );

    // Sends and create the transaction
    await provider.sendAndConfirm(mint_tx, []);

    // Executes our transfer smart contract 
    await program.methods.transferToken(amountToTransfer).accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      from: ata,
      fromAuthority: auth,
      to: receiverAta,
    }).rpc();

    amount = await balc(provider, ata, 'ata', 1)
    assert.equal(amount, amountToMint - amountToTransfer);

    amount = await balc(provider, receiverAta, 'receiverAta', 1)
    assert.equal(amount, amountToTransfer);
  });
});
