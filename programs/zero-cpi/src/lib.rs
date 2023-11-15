use anchor_lang::prelude::*;
use zero_copy::cpi::accounts::UpdateBar;
use zero_copy::program::ZeroCopy;
use zero_copy::{self, Bar, Foo};

declare_id!("3KkGvkE9vY5FkccNkfFhqi9iyoo7QyAVkQ2n6TmmMW3Y");

#[program]
pub mod zero_cpi {
    use super::*;
    pub fn check_cpi(ctx: Context<CheckCpi>, data: u64) -> Result<()> {
        let cpi_program = ctx.accounts.zero_copy_program.to_account_info();
        let cpi_accounts = UpdateBar {
            authority: ctx.accounts.authority.clone(),
            bar: ctx.accounts.bar.to_account_info(),
            foo: ctx.accounts.foo.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        zero_copy::cpi::update_bar(cpi_ctx, data)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CheckCpi<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    bar: AccountLoader<'info, Bar>,
    #[account(signer)]
    /// CHECK: is unsafe, but is not documented. explaining here why no checks through types are necessary
    authority: AccountInfo<'info>,
    foo: AccountLoader<'info, Foo>,
    zero_copy_program: Program<'info, ZeroCopy>,
}
