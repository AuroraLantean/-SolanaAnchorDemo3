use anchor_lang::prelude::*;

declare_id!("7mMu435prH2sgPhnT2UuYTCCMfQyxdA8XpwLX7sEx6L7");
//MUST be the same id declared in Anchor.toml

#[program]
pub mod abc {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, num: u64) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.authority = *ctx.accounts.authority.key;
        my_account.num = num;
        Ok(())
    }
    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.num += 1;
        Ok(())
    }
    pub fn update(ctx: Context<Update>, num: u64) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.num = num;
        Ok(())
    }
}

//account space: 8 for 4 digits, 40 for u64
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 40)]
    pub my_account: Account<'info, MyAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut, has_one = authority)]
    pub my_account: Account<'info, MyAccount>,
    pub authority: Signer<'info>,
}
#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut, has_one = authority)]
    pub my_account: Account<'info, MyAccount>,
    pub authority: Signer<'info>,
}

#[account]
pub struct MyAccount {
    pub authority: Pubkey,
    pub num: u64,
}
