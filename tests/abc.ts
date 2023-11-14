import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Abc } from "../target/types/abc";
import { Puppet } from "../target/types/puppet";
const { SystemProgram } = anchor.web3;
import assert from "assert";

/* To add programs from Anchor repo or others: 
# Copy their folders into "program" folder. Fix their Cargo.toml/anchor-lang, anchor-client dependencies to "version = 0.29.0"
# Add the programId into root/Anchor.toml: [programs.localnet]. 
# Add their test file into root/tests and change its extension to .ts
 */
const bn = (num: number) => new anchor.BN(num);

describe("abc", () => {
  // Use a local provider.
  const provider = anchor.AnchorProvider.local();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.Abc as Program<Abc>;
  const puppet = anchor.workspace.Puppet as Program<Puppet>;

  const counterSeed = anchor.utils.bytes.utf8.encode("my_pda");
  let pdaPubk: anchor.web3.PublicKey;
  before(async () => {
    [pdaPubk] = anchor.web3.PublicKey.findProgramAddressSync(
      [counterSeed],
      program.programId
    );
  });

  const puAccountKP = anchor.web3.Keypair.generate();
  const myAccountKP = anchor.web3.Keypair.generate();
  const lg = console.log;
  const auth = provider.wallet.publicKey;
  let [actionState] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("action-state"), auth.toBuffer()],
    program.programId
  );

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
    assert.ok(account.num.toNumber() === 1234);
    //assert.ok(account.num.eq(bn(1234)));
    assert.ok(account.authority.equals(auth));
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

    assert.ok(account.authority.equals(auth));
    assert.ok(account.num.eq(dataN1));
    //assert.ok(account.num.toNumber() == 4322);

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
    assert.ok(puAccount.num.eq(new anchor.BN(111)));
  });

  it("PDA", async () => {
    lg("step 201 make_pda")
    // Initialize the program's state struct.
    await program.methods
      .makeFixedPda()
      .accounts({
        myPda: pdaPubk,
        authority: auth,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    let myPda = await program.account.myPda.fetch(pdaPubk);
    assert.ok(myPda.count.eq(new anchor.BN(0)));

    lg("step 202 increment")
    await program.methods
      .incrementFixedPda()
      .accounts({
        myPda: pdaPubk,
        authority: auth,
      })
      .rpc();
    myPda = await program.account.myPda.fetch(pdaPubk);
    assert.ok(myPda.count.eq(new anchor.BN(1)));
  });

  it("Test Make Dynamic PDA", async () => {
    // Create instruction: set up the Solana accounts to be used
    const createInstruction = await program.methods
      .makeDynamicPda()
      .accounts({
        actionState,
        auth,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();
    const resetInstruction = await program.methods
      .resetDynamicPda()
      .accounts({
        actionState,
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
    let result = await program.account.actionState.fetch(actionState);
    lg("Robot action state details: ", result);
  }
});
