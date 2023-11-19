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
import { accInfoB, bn, getPdaKB, getTokPdaKB, lam } from "../utils";
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

  const mintKP = anchor.web3.Keypair.generate();//like a new token address
  const amountToMint = 1000;
  const amountToTransfer = 123;
  let amount = 0;
  let ata1: PublicKey;// AssociatedTokenAccount for anchor's workspace wallet

  it("transfer_lamports_to_new_pda", async () => {
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
    //const userPdaLam = await program.provider.connection.getBalance(userPdaUkey);
    lg('userPdaLam:', userPdaAcctInfo.lamports)

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
    //const userPdaLam = await program.provider.connection.getBalance(userPdaUkey);
    lg('userPdaLam:', userPdaAcctInfo.lamports)

    const userPda = await program.account.userPda.fetch(userPdaUkey);
    lg('deposit:', userPda.deposit.toNumber())
    assert(userPda.deposit.eq(lam(2)));
  });

  it("Mint a token to PK ATA", async () => {
    const lamports: number = await program.provider.connection.getMinimumBalanceForRentExemption(
      MINT_SIZE
    );//to pay for rent

    // Get the AssociatedTokenAccount(ATA) for a token and the account that we want to own the ATA (but it might not existing on the SOL network yet)
    ata1 = await getAssociatedTokenAddress(
      mintKP.publicKey,
      auth
    );

    // Fires a list of instructions
    const mint_tx = new anchor.web3.Transaction().add(
      // make an account from the mint key
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: auth,//transferring SOL from this
        newAccountPubkey: mintKP.publicKey,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,//owner of the new account
        lamports,
      }),
      // add a transaction to make our mint account that is controlled by our anchor wallet
      createInitializeMintInstruction(
        mintKP.publicKey, 0, auth, auth
      ),
      // make the ATA1 from mintKP and wallet
      createAssociatedTokenAccountInstruction(
        auth, ata1, auth, mintKP.publicKey
      )
    );

    const res = await provider.sendAndConfirm(mint_tx, [mintKP]);
    lg("res: ", res);
    lg("Mint key: ", mintKP.publicKey.toString());
    lg("Auth: ", auth.toString());

    await accInfoB(provider, mintKP.publicKey, 'mintKP.pubk', 0)

    await program.methods.mintToken(amountToMint).accounts({
      mint: mintKP.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      toAta: ata1,
      auth: auth,
    }).rpc();

    amount = await accInfoB(provider, ata1, 'ata1', 0)
    assert.equal(amount, amountToMint);
  });

  it("Transfer token to PK ATA", async () => {
    const receiverKP: anchor.web3.Keypair = anchor.web3.Keypair.generate();

    const ata2 = await getAssociatedTokenAddress(
      mintKP.publicKey,
      receiverKP.publicKey
    );//(but might not exist yet)

    const mint_tx = new anchor.web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        auth, ata2, receiverKP.publicKey, mintKP.publicKey
      )
    );// Make ATA2
    await provider.sendAndConfirm(mint_tx, []);

    await program.methods.transferToken(amountToTransfer).accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      fromAta: ata1,
      auth: auth,
      toAta: ata2,
    }).rpc();

    amount = await accInfoB(provider, ata1, 'ata1', 0)
    assert.equal(amount, amountToMint - amountToTransfer);

    amount = await accInfoB(provider, ata2, 'ata2', 0)
    assert.equal(amount, amountToTransfer);

    /*     const amt1 = await program.provider.connection.getTokenAccountBalance(ata1);
        lg("ata1 balc:", amt1.value.uiAmount) */
  });

  it("init_token_pda", async () => {
    const { ukey: userPdaUkey, bump: userPdaBump } = getPdaKB("userpda", auth, program.programId)
    lg("ukey:", userPdaUkey.toBase58(), ', bump:', userPdaBump);
    const { ukey: userTokpdaUkey, bump: userTokpdaBump } = getTokPdaKB(auth, ata1, program.programId)

    let userTokpdaAcctInfo = await provider.connection.getParsedAccountInfo(userTokpdaUkey);
    lg("userTokpdaAcctInfo: ", userTokpdaAcctInfo)
    if (userTokpdaAcctInfo.value) {
      lg("userTokpdaAcctInfo already exists")
    } else {
      lg("userTokpdaAcctInfo does not exist")
      let tx = await program.methods
        .initTokenPda()
        .accounts({
          userTokpda: userTokpdaUkey,
          userPda: userPdaUkey,
          mint: mintKP.publicKey,
          fromAta: ata1,
          auth,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).rpc();
      lg("initTokenPda tx:", tx);
      let amountTokM = await accInfoB(provider, userTokpdaUkey, 'userTokpdaUkey', 1)
      assert.equal(amountTokM, 0);
    }
  });

  it("transfer_token_to_pda", async () => {
    const { ukey: userPdaUkey, bump: userPdaBump } = getPdaKB("userpda", auth, program.programId)
    lg("ukey:", userPdaUkey.toBase58(), ', bump:', userPdaBump);
    const { ukey: userTokpdaUkey, bump: userTokpdaBump } = getTokPdaKB(auth, ata1, program.programId)
    lg("ukey:", userTokpdaUkey.toBase58(), ', bump:', userTokpdaBump);
    let amountAta1Bf = await accInfoB(provider, ata1, 'ata1', 0)
    let amountTokBf = await accInfoB(provider, userTokpdaUkey, 'userTokpdaUkey', 0)

    let amountTok = 77;
    let amountTokBn = bn(amountTok)
    let tx = await program.methods
      .transferTokenToPda(amountTokBn)
      .accounts({
        userTokpda: userTokpdaUkey,
        mint: mintKP.publicKey,
        userPda: userPdaUkey,
        fromAta: ata1,
        auth,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }).rpc();
    lg("transferTokensToPda tx:", tx);

    let userTokpdaAcctInfo = await provider.connection.getParsedAccountInfo(userTokpdaUkey);
    lg("userTokpdaAcctInfo: ", userTokpdaAcctInfo)

    if (userTokpdaAcctInfo.value) {
      lg("userTokpdaAcctInfo exists")
      let amountTokM = await accInfoB(provider, userTokpdaUkey, 'userTokpdaUkey', 0)
      assert.equal(amountTokM, amountTokBf + amountTok);

      let amountAta1Af = await accInfoB(provider, ata1, 'ata1', 0)
      assert.equal(amountAta1Af, amountAta1Bf - amountTok);
    } else {
      lg("userTokpdaAcctInfo does not exist! Error!")
    }
  });
});
