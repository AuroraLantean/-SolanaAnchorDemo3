import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Abc } from "../target/types/abc";
import { Puppet } from "../target/types/puppet";
const { SystemProgram } = anchor.web3;
import { assert } from "chai";
//import assert from "assert";
import { bn, lg, getPdaKB, zero } from "../utils";

/* To add programs from Anchor repo or others: 
# Copy their folders into "program" folder. Fix their Cargo.toml/anchor-lang, anchor-client dependencies to "version = 0.29.0"
[package]
name = "social-media"
[lib]
crate-type = ["cdylib", "lib"]
name = "social_media" ... this MUST match mod name in lib.rs
# Add the programId into root/Anchor.toml: [programs.localnet]. 
# Add their test file into root/tests and change its extension to .ts
 */

describe("abc", () => {
  // Use a local provider.
  const provider = anchor.AnchorProvider.local();
  //const provider = anchor.AnchorProvider.env();//ANCHOR_PROVIDER_URL environment variable

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.Abc as Program<Abc>;
  const puppet = anchor.workspace.Puppet as Program<Puppet>;

  const counterSeed = anchor.utils.bytes.utf8.encode("my_pda");
  let pdaPubkey: anchor.web3.PublicKey;
  let bump: number;
  before(async () => {
    [pdaPubkey, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [counterSeed],
      program.programId
    );
  });

  const puAccountKP = anchor.web3.Keypair.generate();
  const myAccountKP = anchor.web3.Keypair.generate();
  const auth = provider.wallet.publicKey;

  const { ukey: pda1Pubkey, bump: pda1bump } = getPdaKB("pda", auth, program.programId)
  /*   const [pda1Pubkey, pda1bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pda"), auth.toBuffer()],
      program.programId
    ); */
  lg("Program ID:", program.programId.toString());
  it("initializes an account", async () => {
    lg("step 98")
    const txpuppet = await puppet.methods
      .initialize()
      .accounts({
        puppet: puAccountKP.publicKey,
        authority: auth,
        systemProgram: SystemProgram.programId,
      })
      .signers([puAccountKP])
      .rpc();
    lg("step 99. txpuppet:", txpuppet)

    lg("step 100")
    const tx = await program.methods
      .initialize(bn(1234))
      .accounts({
        myAccount: myAccountKP.publicKey,
        authority: auth,
        systemProgram: SystemProgram.programId,
      })
      .signers([myAccountKP])
      .rpc();
    lg("Your transaction signature:", tx);

    let account = await program.account.myAccount.fetch(myAccountKP.publicKey);

    lg("step 101")
    assert(account.num.toNumber() === 1234);
    //assert(account.num.eq(bn(1234)));
    assert(account.authority.equals(auth));
    lg("step 104")

    // Invoke the update rpc.
    let dataN1 = bn(4321)
    await program.methods
      .update(dataN1)
      .accounts({
        myAccount: myAccountKP.publicKey,
        authority: auth,
      })
      .rpc();
    lg("step 105")

    account = await program.account.myAccount.fetch(myAccountKP.publicKey);

    assert(account.authority.equals(auth));
    assert(account.num.eq(dataN1));
    //assert(account.num.toNumber() == 4322);

    lg("step 106")
    // Invoke CPI to the puppet.
    await program.methods
      .pullStrings(new anchor.BN(111))
      .accounts({
        puppetAccount: puAccountKP.publicKey,
        puppetProgram: puppet.programId,
      })
      .rpc();
    lg("step 108")
    const puAccount = await puppet.account.puAccount.fetch(puAccountKP.publicKey);
    assert(puAccount.num.eq(bn(111)));
  });

  it("PDA", async () => {
    lg("step 201 make_pda")
    // Initialize the program's state struct.
    await program.methods
      .makeFixedPda()
      .accounts({
        myPda: pdaPubkey,
        authority: auth,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    let myPda = await program.account.myPda.fetch(pdaPubkey);
    assert(myPda.count.eq(zero));

    lg("step 202 increment")
    await program.methods
      .incrementFixedPda()
      .accounts({
        myPda: pdaPubkey,
        authority: auth,
      })
      .rpc();
    myPda = await program.account.myPda.fetch(pdaPubkey);
    assert(myPda.count.eq(bn(1)));
  });

  it("Test Make Dynamic PDA", async () => {
    // See SocialMedia for a better way to test
    const createInstruction = await program.methods
      .makeDynamicPda()
      .accounts({
        pda: pda1Pubkey,
        auth,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();// See SocialMedia for another way
    const resetInstruction = await program.methods
      .resetDynamicPda()
      .accounts({
        pda: pda1Pubkey,
        auth,
      })
      .instruction();

    // Array of instructions
    const instructions: anchor.web3.TransactionInstruction[] = [
      createInstruction,
      resetInstruction,
    ];

    await createAndSendV0Tx(instructions);
  });
  async function createAndSendV0Tx(
    txInstructions: anchor.web3.TransactionInstruction[]
  ) {
    // Step 1 - Fetch the latest blockhash
    let latestBlockhash = await provider.connection.getLatestBlockhash(
      "confirmed"
    );
    lg(
      "   ✅ - Fetched latest blockhash. Last Valid Height:",
      latestBlockhash.lastValidBlockHeight
    );

    // Step 2 - Generate Transaction Message
    const messageV0 = new anchor.web3.TransactionMessage({
      payerKey: auth,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: txInstructions,
    }).compileToV0Message();
    lg("   ✅ - Compiled Transaction Message");
    const transaction = new anchor.web3.VersionedTransaction(messageV0);

    // Step 3 - Sign your transaction with the required `Signers`
    provider.wallet.signTransaction(transaction);
    lg("   ✅ - Transaction Signed");

    // Step 4 - Send our v0 transaction to the cluster
    const txid = await provider.connection.sendTransaction(transaction, {
      maxRetries: 5,
    });
    lg("   ✅ - Transaction sent to network");

    // Step 5 - Confirm Transaction
    const confirmation = await provider.connection.confirmTransaction({
      signature: txid,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    if (confirmation.value.err) {
      throw new Error(
        `   ❌ - Transaction not confirmed.\nReason: ${confirmation.value.err}`
      );
    }

    lg("🎉 Transaction Succesfully Confirmed!");
    let result = await program.account.pda1.fetch(pda1Pubkey);
    lg("Robot action state details: ", result);
  }
});
