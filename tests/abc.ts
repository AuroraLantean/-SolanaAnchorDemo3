import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Abc } from "../target/types/abc";
const { SystemProgram } = anchor.web3;
import assert from "assert";

describe("abc", () => {
  // Use a local provider.
  const provider = anchor.AnchorProvider.local();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.Abc as Program<Abc>;

  // The Account to create.
  const myAccount = anchor.web3.Keypair.generate();

  it("Creates and initializes an account in a single atomic transaction (simplified)", async () => {

    // The Account to create.
    const myAccount = anchor.web3.Keypair.generate();

    // Create the new account and initialize it with the program.
    // #region code-simplified
    const tx = await program.methods
      .initialize(new anchor.BN(1234))
      .accounts({
        myAccount: myAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([myAccount])
      .rpc();
    // #endregion code-simplified
    console.log("Your transaction signature", tx);

    // Fetch the newly created account from the cluster.
    let account = await program.account.myAccount.fetch(myAccount.publicKey);

    // Check it's state was initialized.
    assert.ok(account.data.eq(new anchor.BN(1234)));

    // Store the account for the next test.
    // #region update-test

    // Invoke the update rpc.
    await program.methods
      .update(new anchor.BN(4321))
      .accounts({
        myAccount: myAccount.publicKey,
      })
      .rpc();

    // Fetch the newly updated account.
    account = await program.account.myAccount.fetch(myAccount.publicKey);

    // Check it's state was mutated.
    assert.ok(account.data.eq(new anchor.BN(4321)));

    // #endregion update-test
  });

});
