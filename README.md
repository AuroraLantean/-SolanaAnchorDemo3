# SolanaAnchorDemo3

---

## Hyperledger Solang

#### Breakpoint 2023 November: Solang: Running Solidity Natively on Solana

https://www.youtube.com/watch?v=xF2f5WSlIgk

#### Why Solang - Announcement from Solana: Hyperledger Solang opens Solana to Ethereum’s Solidity developers

19 July 2023
https://solana.com/news/solang-solana-solidity-evm
https://solana.com/news/solang-solana-solidity-evm
Hyperledger Solang opens Solana to Ethereum’s Solidity developers

- Compatibility with Ethereum Solidity 0.8
- Ability to call other Solana smart contracts
- Supports Solana SPL tokens
- Supports program derived addresses
- Enables development with Anchor
- Builds native Solana smart contracts
- Access to native Solana builtin functionality

#### What is Solang

a new compiler to compile Solidity smart contracts for Solana and Polkadot!
See the [docs](https://solang.readthedocs.io/en/latest/)
Solang uses the llvm compiler framework to produce WebAssembly (WASM) or Solana SBF contract code. As result, the output is highly optimized, which saves you in gas costs or compute units.

## Install Solang

See [Steps here](https://solang.readthedocs.io/en/v0.3.3/installing.html)

---

## Install PNPM as a NPM Package Manager

See [PNPM installation](https://pnpm.io/installation)

Then install all NPM packages:
`$ pnpm install`

---

## Install Yarn or Bun to run JavaScript runtime

See [Yarn installation](https://yarnpkg.com/getting-started/install)
See [BUN installation](https://bun.sh/docs/installation)

---

## Install Rust

See [Rust installation](https://www.rust-lang.org/tools/install)

If you already have Rust: `$ rustup update stable`

`$ rustc --version`

---

## Install Solana

See [Solana installation](https://docs.solana.com/cli/install-solana-cli-tools)

To update existing installed Solana to a newer version:

`solana-install update`

Confirm the installed Solana version 1.17.5:

`$ solana --version`

---

## Test running Solana Test Validator

`$ solana-test-validator`
then you should see something like...

```
Ledger location: test-ledger
Log: test-ledger/validator.log
⠁ Initializing...
Identity: BPS41o6phpkffnbfdnfnbfdbfnrfnrnrnrnnr
Genesis Hash: EEuUfC8ukiluiiiuikuiyukuy
Version: 1.9.4
Shred Version: 15551
Gossip Address: 127.0.0.1:1024
TPU Address: 127.0.0.1:1027
JSON RPC URL: http://127.0.0.1:8899
⠁ 00:00:20 | Processed Slot: 36 | Confirmed Slot: 36 | Finalized Slot: 4 | Full Snapshot Slot: - | Incremental Snaps
```

## Shut Down Local Network

press control + c

`Note. YOU MUST SHUT DOWN any Solana local network for Anchor to run its own Solana local network as part of testing!`

---

## Install Anchor

Anchor is a framework for Solana's Sealevel runtime providing several convenient developer tools.
[source](https://www.anchor-lang.com/docs/installation)

```
sudo apt-get update && sudo apt-get upgrade && sudo apt-get install -y pkg-config build-essential libudev-dev libssl-dev
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

avm install latest
avm use latest
anchor --version
```

Confirm the installed Anchor-CLI version is 0.29.0

`$ anchor --version`

---

## Configure Solana CLI to Localhost

`$ solana config get`

output:

```
Config File: /home/username/.config/solana/cli/config.yml
RPC URL: http://localhost:8899
WebSocket URL: ws://localhost:8900/ (computed)
Keypair Path: /home/username/.config/solana/id.json
Commitment: confirmed
```

If your configuration is on any different network than the one above (such as devnet or mainnet-beta) you can switch it over to localhost with the following command

`$ solana config set --url localhost`

---

## Setup Local Wallet

```
$ solana-keygen new -o ~/.config/solana/id.json
```

## Confirm Your New Local Wallet

```
$ solana-keygen pubkey ~/.config/solana/id.json
```

## Update your Solana local wallet path in Anchor.toml

```
[toolchain]

[features]
seeds = false
skip-lint = false

[programs.localnet]
abc = "7mMu435prH2sgPhnT2UuYTCCMfQyxdA8XpwLX7sEx6L7"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "bun run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"

```

The default settings above in Anchor.toml assumes your filesystem wallet is located at ~/.config/solana/id.json. If you are using Windows OS, you might need to change it inside your Anchor.toml file to

```
wallet = "/Users/YOUR_USER_NAME/.config/solana/id.json"
```

---

## Compile and build the Solana program

In Cargo.toml, enter the Rust module/package you do not want to compile to save compilation time:

```
exclude = [
  "programs/abc",
  "programs/zero-copy",
  "programs/zero-cpi",
  "programs/puppet",
]
```

Compile the Solana program: `$ anchor build`

---

## To Run Test

In Anchor.toml/[scripts], enter the test you want to run:

```
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/module_name.ts"
```

Compile, deploy to local testnet, and run test: `$ anchor test`

---

## Anchor JS and Rust dependency problem

According to [Anchor Github page](https://github.com/coral-xyz/anchor), update Anchor in Rust by going to project root/programs/abc/Cargo.toml, then change the two anchor dependencies from 0.19.0 to 0.20.1

```
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
anchor-client = "0.29.0"
```

Run command: `anchor test`
