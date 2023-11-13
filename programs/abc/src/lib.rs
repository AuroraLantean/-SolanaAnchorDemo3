use anchor_lang::prelude::*;

declare_id!("7mMu435prH2sgPhnT2UuYTCCMfQyxdA8XpwLX7sEx6L7");

#[program]
pub mod abc {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
