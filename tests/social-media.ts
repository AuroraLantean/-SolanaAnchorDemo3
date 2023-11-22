import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SocialMedia } from "../target/types/social_media";
const { SystemProgram } = anchor.web3;
import { assert } from "chai";
import { bn, lg, getPda2KB, zero } from "./utils";
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
describe("initUserPda", () => {
  const provider = anchor.AnchorProvider.local();
  //const provider = anchor.AnchorProvider.env();//ANCHOR_PROVIDER_URL environment variable
  anchor.setProvider(provider);

  const program = anchor.workspace.SocialMedia as Program<SocialMedia>;

  /*const counterSeed = anchor.utils.bytes.utf8.encode("my_pda");
  let pdaPubkey: anchor.web3.PublicKey;
  let bump: number;
  before(async () => {
      [pdaPubkey, bump] = anchor.web3.PublicKey.findProgramAddressSync(
        [counterSeed],
        program.programId
      );
    }); */
  lg("Program ID:", program.programId.toString());
  lg('systemProgramId:', SystemProgram.programId.toString());
  const secretstr = 'secret'
  const auth = provider.wallet.publicKey;
  const { ukey: userPdaUkey, bump: userPdaBump } = getPda2KB(secretstr, "user", auth, program.programId)

  it("initUserPda", async () => {
    const username = "john"
    const tx = await program.methods
      .initUserPda(secretstr, userPdaBump, username)
      .accounts({
        userPda: userPdaUkey,
        user: auth,//user1KP.publicKey,//
        systemProgram: SystemProgram.programId,
      }).rpc();//.signers([user1KP])
    lg("initUserPda tx:", tx);

    const userPdaAcctInfo = await program.provider.connection.getAccountInfo(userPdaUkey)
    lg("userPdaAcctInfo:", userPdaAcctInfo)
    if (userPdaAcctInfo) {
      lg("userPdaUkey is generated. owner:", userPdaAcctInfo.owner.toString());
    }
    assert(userPdaAcctInfo.owner.equals(program.programId))
    lg("get userPda account");
    let userPda = await program.account.userPda.fetch(userPdaUkey);
    lg(userPda.user.toBase58(), userPda.user.toString())
    assert(userPda.user.equals(auth));
    assert(userPda.bump === userPdaBump);
    assert(userPda.username === username);
    assert(userPda.stakingTotal.eq(zero));
    assert(userPda.timestamp === 0);
    lg("user has been made")
  })

  it("userStake", async () => {
    // Invoke the update rpc.
    let stakeAmt = bn(4321)
    await program.methods
      .userStake(stakeAmt)
      .accounts({
        userPda: userPdaUkey,
        user: auth,
      })
      .rpc();
    lg("step 105")
    const userPda = await program.account.userPda.fetch(userPdaUkey);
    lg("step. userPda:", userPda.timestamp)
    assert(userPda.stakingTotal.eq(stakeAmt));
  });

  const stakeArrayKP = anchor.web3.Keypair.generate();
  const size = 1000000 + 8; // Account size in bytes.
  it("Creates a large stake queue", async () => {
    await program.rpc.makeLargeAccount({
      accounts: {
        stakeArray: stakeArrayKP.publicKey,
        //rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      instructions: [
        await program.account.stakeArray.createInstruction(stakeArrayKP, size),
      ],
      signers: [stakeArrayKP],
    });
    /*     program.methods.makeLargeAccount().accounts(
          {
            stakeArray: stakeArrayKP.publicKey,
            //rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          }).postInstructions([
            await program.account.stakeArray.createInstruction(stakeArrayKP, size),
          ]).signers([stakeArrayKP]); */

    const account = await program.account.stakeArray.fetch(stakeArrayKP.publicKey);
    assert.strictEqual(account.stakes.length, 25000);
    account.stakes.forEach((stake) => {
      //assert.isTrue(stake.from.equals(anchor.web3.PublicKey.default));
      assert.strictEqual(stake.amount.toNumber(), 0);
    });
  });

  it("Set Auth on large account", async () => {
    await program.methods.setLargeAccount().accounts({
      stakeArray: stakeArrayKP.publicKey,
      auth,
    }).rpc();
    let account = await program.account.stakeArray.fetch(stakeArrayKP.publicKey);
    assert(account.auth.equals(auth));
  });

  let pool_id = 0, amount = bn(48), share = bn(0), reward = bn(0);
  it("Updates a large queue", async () => {
    await program.methods.updateLargeAccount(pool_id, amount, share, reward).accounts({
      stakeArray: stakeArrayKP.publicKey,
      auth,
    }).rpc();

    // Verify update.
    let account = await program.account.stakeArray.fetch(stakeArrayKP.publicKey);
    assert.strictEqual(account.stakes.length, 25000);
    account.stakes.forEach((stake, idx) => {
      if (idx === 0) {
        assert.strictEqual(stake.amount.toNumber(), 48);
      } else {
        assert.strictEqual(stake.amount.toNumber(), 0);
      }
    });

    pool_id = 11111, amount = bn(56), share = bn(0), reward = bn(0);
    await program.rpc.updateLargeAccount(pool_id, amount, share, reward, {
      accounts: {
        stakeArray: stakeArrayKP.publicKey,
        auth,
      },
    });
    // Verify update.
    account = await program.account.stakeArray.fetch(stakeArrayKP.publicKey);
    assert.strictEqual(account.stakes.length, 25000);
    account.stakes.forEach((stake, idx) => {
      if (idx === 0) {
        assert.strictEqual(stake.amount.toNumber(), 48);
      } else if (idx === 11111) {
        assert.strictEqual(stake.amount.toNumber(), 56);
      } else {
        assert.strictEqual(stake.amount.toNumber(), 0);
      }
    });
  });

  it("initUserPda from KP", async () => {
    const user1KP = anchor.web3.Keypair.generate();
    //await program.account.userAcct1.createInstruction(user1KP);

    const { ukey: userPdaUkey, bump: userPdaBump } = getPda2KB(secretstr, "user", user1KP.publicKey, program.programId);
    let token_airdrop = await provider.connection.requestAirdrop(user1KP.publicKey, 10 * LAMPORTS_PER_SOL);
    const latestBlockHash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: token_airdrop,
    });
    lg("after airdropping lamports...")

    const username = "john"
    const tx = await program.methods
      .initUserPda(secretstr, userPdaBump, username)
      .accounts({
        userPda: userPdaUkey,
        user: user1KP.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1KP]).rpc();
    lg("initUserPda tx:", tx);
  })
});
