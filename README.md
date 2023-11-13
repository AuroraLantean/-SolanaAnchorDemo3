# SolanaAnchorDemo3

---

## Install PNPM as a NPM Package Manager

See [PNPM installation](https://pnpm.io/installation)

Install all NPM packages:
`$ pnpm install`

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
[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"

[programs.localnet]
abc = "<program_id>"

[workspace]
members = ["programs/abc"]

[registry]
url = "https://anchor.projectserum.com"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/abc.ts"

```

The default settings above in Anchor.toml assumes your filesystem wallet is located at ~/.config/solana/id.json. If you are using Windows OS, you might need to change it inside your Anchor.toml file to

```
wallet = "/Users/YOUR_USER_NAME/.config/solana/id.json"
```

---

## Compile and build the Solana program

`$ yarn build`

output:

```
yarn run v1.22.17
$ anchor build
BPF SDK: /home/user1234/.local/share/solana/install/releases/1.9.4/solana-release/bin/sdk/bpf
cargo-build-bpf child: rustup toolchain list -v
cargo-build-bpf child: cargo +bpf build --target bpfel-unknown-unknown --release
    Finished release [optimized] target(s) in 0.17s
cargo-build-bpf child: /home/user1234/.local/share/solana/install/releases/1.9.4/solana-release/bin/sdk/bpf/dependencies/bpf-tools/llvm/bin/llvm-readelf --dyn-symbols /mnt/sda4/0Programming/1Solana/1anchorDemo2/target/deploy/abc.so

To deploy this program:
  $ solana program deploy /mnt/sda4/0Programming/1Solana/1anchorDemo2/target/deploy/abc.so
The program address will default to this keypair (override with --program-id):
  /mnt/sda4/0Programming/1Solana/1anchorDemo2/target/deploy/abc-keypair.json
Done in 0.73s.

```

---

## To Run Test

`$ yarn test`

output:

```
  zero-copy
    ✔ Is creates a zero copy account (411ms)
    ✔ Updates a zero copy account field (411ms)

  2 passing (826ms)

```

---

## Anchor JS and Rust dependency problem

update Anchor in Rust by going to project root/programs/abc/Cargo.toml, then change the two anchor dependencies from 0.19.0 to 0.20.1

```
anchor-lang = "0.20.1"
anchor-spl = "0.20.1"
```

Run `yarn test`

---

## Invoking imported functions in Typescript problem

See the test file at ./tests/abc.ts

if you uncomment any of those lines below at line 133 and 134, and run the test again

```
  //log2('here log2');
  //console.log('bn(3):', bn(3));
```

output:

```
TypeError: Unknown file extension ".ts" for /mnt/sda4/0Programming/1Solana/1anchorDemo2/tests/abc.ts
    at new NodeError (node:internal/errors:371:5)
    at Object.file: (node:internal/modules/esm/get_format:72:15)
    at defaultGetFormat (node:internal/modules/esm/get_format:85:38)
    at defaultLoad (node:internal/modules/esm/load:13:42)
    at ESMLoader.load (node:internal/modules/esm/loader:303:26)
    at ESMLoader.moduleProvider (node:internal/modules/esm/loader:230:58)
    at new ModuleJob (node:internal/modules/esm/module_job:63:26)
    at ESMLoader.getModuleJob (node:internal/modules/esm/loader:244:11)
    at async Promise.all (index 0)
    at ESMLoader.import (node:internal/modules/esm/loader:281:24)
    at importModuleDynamicallyWrapper (node:internal/vm/module:437:15)
    at formattedImport (/mnt/sda4/0Programming/1Solana/1anchorDemo2/node_modules/mocha/lib/nodejs/esm-utils.js:7:14)
    at Object.exports.requireOrImport (/mnt/sda4/0Programming/1Solana/1anchorDemo2/node_modules/mocha/lib/nodejs/esm-utils.js:48:32)
    at Object.exports.loadFilesAsync (/mnt/sda4/0Programming/1Solana/1anchorDemo2/node_modules/mocha/lib/nodejs/esm-utils.js:88:20)
    at singleRun (/mnt/sda4/0Programming/1Solana/1anchorDemo2/node_modules/mocha/lib/cli/run-helpers.js:125:3)
    at Object.exports.handler (/mnt/sda4/0Programming/1Solana/1anchorDemo2/node_modules/mocha/lib/cli/run.js:374:5)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

```

So somehow, the test file cannot run any imported functions!!!???

Please advise. thank you
