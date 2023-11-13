use anchor_lang::prelude::*;

declare_id!("7mMu435prH2sgPhnT2UuYTCCMfQyxdA8XpwLX7sEx6L7");
//MUST be the same id declared in Anchor.toml

#[program]
pub mod abc {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, num: u64, authority: Pubkey) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.authority = authority;
        my_account.num = num;
        Ok(())
    }
    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.num += 1;
        Ok(())
    }
    pub fn update(ctx: Context<Update>, num: u64) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.num = num;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 40)]
    pub my_account: Account<'info, MyAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut, has_one = authority)]
    pub counter: Account<'info, MyAccount>,
    pub authority: Signer<'info>,
}
#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub my_account: Account<'info, MyAccount>,
}

#[account]
pub struct MyAccount {
    pub authority: Pubkey,
    pub num: u64,
}
