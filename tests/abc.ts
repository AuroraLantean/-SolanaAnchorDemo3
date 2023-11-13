import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Abc } from "../target/types/abc";
const { SystemProgram } = anchor.web3;
import assert from "assert";

const bn = (num: number) => new anchor.BN(num);

describe("abc", () => {
  // Use a local provider.
  const provider = anchor.AnchorProvider.local();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.Abc as Program<Abc>;

  // The Account to create.
  const myAccount = anchor.web3.Keypair.generate();
  const lg = console.log;
  const auth = provider.wallet.publicKey;

  it("initializes an account", async () => {
    lg("step 100")
    // Make the new account and initialize it with the program.
    // #region code-simplified
    const tx = await program.methods
      .initialize(bn(1234), auth)
      .accounts({
        myAccount: myAccount.publicKey,
        user: auth,
        systemProgram: SystemProgram.programId,
      })
      .signers([myAccount])
      .rpc();
    // #endregion code-simplified
    console.log("Your transaction signature:", tx);

    // Fetch the newly created account from the cluster.
    let account = await program.account.myAccount.fetch(myAccount.publicKey);

    lg("step 101")
    // Check it's state was initialized.
    assert.ok(account.num.toNumber() === 1234);
    //assert.ok(account.num.eq(bn(1234)));
    assert.ok(account.authority.equals(auth));
    // Store the account for the next test.
    // #region update-test
    lg("step 104")

    // Invoke the update rpc.
    let dataN1 = bn(4321)
    await program.methods
      .update(dataN1)
      .accounts({
        myAccount: myAccount.publicKey,
      })
      .rpc();
    lg("step 105")

    // Fetch the newly updated account.
    account = await program.account.myAccount.fetch(myAccount.publicKey);

    // Check it's state was mutated.
    assert.ok(account.num.eq(dataN1));

    lg("step 106")
    // Increment num
    await program.methods
      .increment()
      .accounts({
        counter: myAccount.publicKey,
        authority: auth,
      })
      .rpc();

    account = await program.account.myAccount.fetch(
      myAccount.publicKey
    );

    assert.ok(account.authority.equals(auth));
    assert.ok(account.num.toNumber() == 4322);
  });

});
