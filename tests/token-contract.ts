import * as anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import type { TokenContract } from "../target/types/token_contract";
import {
	TOKEN_PROGRAM_ID,
	MINT_SIZE,
	createAssociatedTokenAccountInstruction,
	getAssociatedTokenAddress,
	createInitializeMintInstruction,
	createMintToCheckedInstruction,
} from "@solana/spl-token";
import {
	type PublicKey,
	clusterApiUrl,
	Connection,
	Keypair,
	LAMPORTS_PER_SOL,
	Transaction,
	SYSVAR_RENT_PUBKEY,
	MAX_SEED_LENGTH,
	sendAndConfirmTransaction,
} from "@solana/web3.js";
import { accInfoB, bn, getPdaKB, getTokPdaKB, lam, zero } from "./utils";
//import { assert } from "chai";
import assert from "node:assert";
//import assert from "assert";

//TODO: add validation to check user credentials
const lg = console.log;
const { SystemProgram } = anchor.web3;
let amtTokPdaAf: number;
let amtAtaAuthAf: number;
let amtAtaAuthBf: number;
let amtTokPdaBf: number;
let amtTok: number;
let amtSol = 1;
let amtBn = bn(0);
let tx: string;
let amtTokBn: anchor.BN;
let userTpdaAcctInfo: anchor.web3.RpcResponseAndContext<
	anchor.web3.AccountInfo<Buffer | anchor.web3.ParsedAccountData>
>;
let userPdaAcctInfo: anchor.web3.AccountInfo<Buffer>;

describe("token-contract", () => {
	const provider = anchor.AnchorProvider.local();
	//const provider = anchor.AnchorProvider.env();

	anchor.setProvider(provider);
	const auth = provider.wallet.publicKey;

	const program = anchor.workspace.TokenContract as Program<TokenContract>;

	const mintKP = anchor.web3.Keypair.generate(); //like a new token address
	const amtToMint = 1000;
	const amtToTransfer = 123;
	let amt = 0;
	let ataAuth: PublicKey; // AssociatedTokenAccount for anchor's workspace wallet

	it("init_user_pda", async () => {
		const { ukey: userPdaUkey, bump: userPdaBump } = getPdaKB(
			"userpda",
			auth,
			program.programId,
		);
		lg("ukey:", userPdaUkey.toBase58(), ", bump:", userPdaBump);

		tx = await program.methods
			.initUserPda()
			.accounts({
				//userPda: userPdaUkey,
				auth,
				//systemProgram: SystemProgram.programId,
			})
			.rpc();
		lg("transferLamportsToPda tx:", tx);
		//await program.provider.connection.sendTransaction(transaction, [mintKP])
		userPdaAcctInfo =
			await program.provider.connection.getAccountInfo(userPdaUkey);
		lg("userPdaAcctInfo:", userPdaAcctInfo);
		if (userPdaAcctInfo) {
			lg("userPdaUkey is generated. owner:", userPdaAcctInfo.owner.toString());
		}
		assert(userPdaAcctInfo.owner.equals(program.programId));
		//const userPdaLam = await program.provider.connection.getBalance(userPdaUkey);
		lg("userPdaLam:", userPdaAcctInfo.lamports);

		const userPda = await program.account.userPda.fetch(userPdaUkey);
		lg("deposit:", userPda.deposit.toNumber());
		assert(userPda.deposit.eq(zero));
	});

	it("transfer_lamports_to_pda", async () => {
		const { ukey: userPdaUkey, bump: userPdaBump } = getPdaKB(
			"userpda",
			auth,
			program.programId,
		);
		lg("ukey:", userPdaUkey.toBase58(), ", bump:", userPdaBump);

		amtSol = 3;
		amtBn = lam(amtSol);
		tx = await program.methods
			.transferLamportToPda(amtBn)
			.accounts({
				userPda: userPdaUkey,
				auth,
				//systemProgram: SystemProgram.programId,
			})
			.rpc();
		lg("transferLamportsToPda tx:", tx);
		//await program.provider.connection.sendTransaction(transaction, [mintKP])
		userPdaAcctInfo =
			await program.provider.connection.getAccountInfo(userPdaUkey);
		lg("userPdaAcctInfo:", userPdaAcctInfo);
		if (userPdaAcctInfo) {
			lg("userPdaUkey is generated. owner:", userPdaAcctInfo.owner.toString());
		}
		assert(userPdaAcctInfo.owner.equals(program.programId));
		//const userPdaLam = await program.provider.connection.getBalance(userPdaUkey);
		lg("userPdaLam:", userPdaAcctInfo.lamports);

		/*let userPda = await program.account.userPda.fetch(userPdaUkey);
        lg('deposit:', userPda.deposit.toNumber())
        assert(userPda.deposit.eq(amt)); */
	});

	it("transfer_lamport_from_pda", async () => {
		const { ukey: userPdaUkey, bump: userPdaBump } = getPdaKB(
			"userpda",
			auth,
			program.programId,
		);
		lg("ukey:", userPdaUkey.toBase58(), ", bump:", userPdaBump);

		lg("201");
		amtSol = 1;
		amtBn = lam(amtSol);
		tx = await program.methods
			.transferLamportFromPda(amtBn, userPdaBump)
			.accounts({
				userPda: userPdaUkey,
				//auth,
				//systemProgram: SystemProgram.programId,
			})
			.rpc();
		lg("transferLamportsFromPda tx:", tx);

		userPdaAcctInfo =
			await program.provider.connection.getAccountInfo(userPdaUkey);
		lg("userPdaAcctInfo:", userPdaAcctInfo);
		if (userPdaAcctInfo) {
			lg("userPda owner:", userPdaAcctInfo.owner.toString());
		}
		assert(userPdaAcctInfo.owner.equals(program.programId));
		//const userPdaLam = await program.provider.connection.getBalance(userPdaUkey);
		lg("userPdaLam:", userPdaAcctInfo.lamports);
	});

	//TODO: export this mint function out to utils
	//TODO: import getBalances2Acct from farm_test
	it("Mint tokens from Auth KP to Auth ATA", async () => {
		const lamports: number =
			await program.provider.connection.getMinimumBalanceForRentExemption(
				MINT_SIZE,
			); //to pay for rent

		// Get the AssociatedTokenAccount(ATA) for a token and the account that we want to own the ATA (but it might not existing on the SOL network yet)
		ataAuth = await getAssociatedTokenAddress(mintKP.publicKey, auth);

		// Fires a list of instructions
		const mint_tx = new anchor.web3.Transaction().add(
			// make an account from the mint key
			anchor.web3.SystemProgram.createAccount({
				fromPubkey: auth, //transferring SOL from this
				newAccountPubkey: mintKP.publicKey,
				space: MINT_SIZE,
				programId: TOKEN_PROGRAM_ID, //owner of the new account
				lamports,
			}),
			// add a transaction to make our mint account that is controlled by our anchor wallet
			createInitializeMintInstruction(mintKP.publicKey, 0, auth, auth),
			// make the ATA from mintKP and wallet
			createAssociatedTokenAccountInstruction(
				auth,
				ataAuth,
				auth,
				mintKP.publicKey,
			),
		);

		const res = await provider.sendAndConfirm(mint_tx, [mintKP]);
		lg("res: ", res);
		lg("Mint key: ", mintKP.publicKey.toString());
		lg("Auth: ", auth.toString());

		await accInfoB(provider, mintKP.publicKey, "mintKP.pubk", 0);

		await program.methods
			.mintToken(amtToMint)
			.accounts({
				mint: mintKP.publicKey,
				//tokenProgram: TOKEN_PROGRAM_ID,
				toAta: ataAuth,
				auth: auth,
			})
			.rpc();

		amt = await accInfoB(provider, ataAuth, "ataAuth", 0);
		assert.equal(amt, amtToMint);
	});

	it("Transfer token to Alice ATA", async () => {
		const aliceKP: anchor.web3.Keypair = anchor.web3.Keypair.generate();

		const ataAlice = await getAssociatedTokenAddress(
			mintKP.publicKey,
			aliceKP.publicKey,
		); //(but might not exist yet)

		const mint_tx = new anchor.web3.Transaction().add(
			createAssociatedTokenAccountInstruction(
				auth,
				ataAlice,
				aliceKP.publicKey,
				mintKP.publicKey,
			),
		); // Make ATA2
		await provider.sendAndConfirm(mint_tx, []);

		await program.methods
			.transferToken(amtToTransfer)
			.accounts({
				//tokenProgram: TOKEN_PROGRAM_ID,
				fromAta: ataAuth,
				auth: auth,
				toAta: ataAlice,
			})
			.rpc();

		amt = await accInfoB(provider, ataAuth, "ataAuth", 0);
		assert.equal(amt, amtToMint - amtToTransfer);

		amt = await accInfoB(provider, ataAlice, "ataAlice", 0);
		assert.equal(amt, amtToTransfer);

		/*     const amt1 = await program.provider.connection.getTokenAccountBalance(ataAuth);
        lg("ataAuth balc:", amt1.value.uiAmount) */
	});

	it("init_token_pda", async () => {
		const { ukey: userPdaUkey, bump: userPdaBump } = getPdaKB(
			"userpda",
			auth,
			program.programId,
		);
		lg("ukey:", userPdaUkey.toBase58(), ", bump:", userPdaBump);
		const { ukey: userTpdaUkey, bump: userTpdaBump } = getTokPdaKB(
			auth,
			ataAuth,
			program.programId,
		);

		userTpdaAcctInfo =
			await provider.connection.getParsedAccountInfo(userTpdaUkey);
		lg("userTpdaAcctInfo: ", userTpdaAcctInfo);
		if (userTpdaAcctInfo.value) {
			lg("userTpdaAcctInfo already exists");
		} else {
			lg("userTpdaAcctInfo does not exist");
			tx = await program.methods
				.initTokenPda()
				.accounts({
					//userTpda: userTpdaUkey,
					userPda: userPdaUkey,
					mint: mintKP.publicKey,
					fromAta: ataAuth,
					auth,
					//tokenProgram: TOKEN_PROGRAM_ID,
					//systemProgram: SystemProgram.programId,
				})
				.rpc();
			lg("initTokenPda tx:", tx);
			amtTokPdaAf = await accInfoB(provider, userTpdaUkey, "userTpdaUkey", 1);
			assert.equal(amtTokPdaAf, 0);
		}
	});

	it("transfer_token_to_tokenPda", async () => {
		const { ukey: userPdaUkey, bump: userPdaBump } = getPdaKB(
			"userpda",
			auth,
			program.programId,
		);
		lg("ukey:", userPdaUkey.toBase58(), ", bump:", userPdaBump);
		const { ukey: userTpdaUkey, bump: userTpdaBump } = getTokPdaKB(
			auth,
			ataAuth,
			program.programId,
		);
		lg("ukey:", userTpdaUkey.toBase58(), ", bump:", userTpdaBump);
		amtAtaAuthBf = await accInfoB(provider, ataAuth, "ataAuth", 0);
		amtTokPdaBf = await accInfoB(provider, userTpdaUkey, "userTpdaUkey", 0);

		amtTok = 77;
		amtTokBn = bn(amtTok);
		tx = await program.methods
			.transferTokenToTokenPda(amtTokBn)
			.accounts({
				userTpda: userTpdaUkey,
				mint: mintKP.publicKey,
				userPda: userPdaUkey,
				ata: ataAuth,
				auth,
				//tokenProgram: TOKEN_PROGRAM_ID,
				//systemProgram: SystemProgram.programId,
			})
			.rpc();
		lg("transferTokensToPda tx:", tx);

		userTpdaAcctInfo =
			await provider.connection.getParsedAccountInfo(userTpdaUkey);
		lg("userTpdaAcctInfo: ", userTpdaAcctInfo);

		if (userTpdaAcctInfo.value) {
			lg("userTpdaAcctInfo exists");
			amtTokPdaAf = await accInfoB(provider, userTpdaUkey, "userTpdaUkey", 0);
			assert.equal(amtTokPdaAf, amtTokPdaBf + amtTok);

			amtAtaAuthAf = await accInfoB(provider, ataAuth, "ataAuth", 0);
			assert.equal(amtAtaAuthAf, amtAtaAuthBf - amtTok);
		} else {
			lg("userTpdaAcctInfo does not exist! Error!");
			assert.equal(1, 2);
		}
	});

	it("transfer_token_from_token_pda", async () => {
		const { ukey: userPdaUkey, bump: userPdaBump } = getPdaKB(
			"userpda",
			auth,
			program.programId,
		);
		lg("ukey:", userPdaUkey.toBase58(), ", bump:", userPdaBump);
		const { ukey: userTpdaUkey, bump: userTpdaBump } = getTokPdaKB(
			auth,
			ataAuth,
			program.programId,
		);
		lg("ukey:", userTpdaUkey.toBase58(), ", bump:", userTpdaBump);
		amtAtaAuthBf = await accInfoB(provider, ataAuth, "ataAuth", 0);
		amtTokPdaBf = await accInfoB(provider, userTpdaUkey, "userTpdaUkey", 0);

		amtTok = 77;
		amtTokBn = bn(amtTok);
		tx = await program.methods
			.transferTokenFromTokenPda(amtTokBn, userPdaBump)
			.accounts({
				userTpda: userTpdaUkey,
				mint: mintKP.publicKey,
				userPda: userPdaUkey,
				ata: ataAuth,
				auth,
				//tokenProgram: TOKEN_PROGRAM_ID,
				//systemProgram: SystemProgram.programId,
			})
			.rpc();
		lg("transferTokenFromTokenPda. tx:", tx);

		userTpdaAcctInfo =
			await provider.connection.getParsedAccountInfo(userTpdaUkey);
		lg("userTpdaAcctInfo: ", userTpdaAcctInfo);

		if (userTpdaAcctInfo.value) {
			lg("userTpdaAcctInfo exists");
			amtTokPdaAf = await accInfoB(provider, userTpdaUkey, "userTpdaUkey", 0);
			assert.equal(amtTokPdaAf, amtTokPdaBf - amtTok);

			amtAtaAuthAf = await accInfoB(provider, ataAuth, "ataAuth", 0);
			assert.equal(amtAtaAuthAf, amtAtaAuthBf + amtTok);
		} else {
			lg("userTpdaAcctInfo does not exist! Error!");
			assert.equal(1, 2);
		}
	});

	it("createTokenAccount", async () => {
		//TODO: createTokenAccount
		//const rewardMint = await createMint(provider, pgSigner);
		//privider, authority
		//const rewardUser = await createTokenAccount(provider, rewardMint, userAcct);
		//lg("rewardUser:", rewardUser.toBase58());
	});
});
