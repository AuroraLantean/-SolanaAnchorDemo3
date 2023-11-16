// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

@program_id("6fiZW8e4d8XYo4XH2tLoFhxjYWpCfeF32XcAMa2KAZyN")
contract solang {
    bool private boo = true;
    uint64 private count;

    @payer(payer)
    constructor() {
        print("Hello, World!");
        count = 0;
    }

    /// A message that can be called on instantiated contracts.
    /// This one flips the boo of the stored `bool` from `true`
    /// to `false` and vice versa.
    function flipBoo() public {
        boo = !boo;
    }

    /// Simply returns the current boo of our `bool`.
    function getBoo() public view returns (bool) {
        return boo;
    }

    function increment(uint64 amount) public {
        count += amount;
    }

    function getCount() public view returns (uint64) {
        return count;
    }
}
