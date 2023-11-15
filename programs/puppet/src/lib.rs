use anchor_lang::prelude::*;

declare_id!("6V7YXxKMPsL1NeJFs5PgkkmTwi5Z5eHfxydi4UxDcBei");

#[program]
pub mod puppet {
    use super::*;
    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn set_data(ctx: Context<SetData>, num: u64) -> Result<()> {
        let puppet = &mut ctx.accounts.pu_account;
        puppet.num = num;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 8)]
    pub puppet: Account<'info, PuAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetData<'info> {
    #[account(mut)]
    pub pu_account: Account<'info, PuAccount>,
}

#[account]
pub struct PuAccount {
    pub num: u64,
}
