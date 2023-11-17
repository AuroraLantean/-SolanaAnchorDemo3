use anchor_lang::prelude::*;
use puppet::cpi::accounts::SetData;
use puppet::program::Puppet;
use puppet::{self, PuAccount};
use std::ops::DerefMut;

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
    pub fn update(ctx: Context<Update>, num: u64) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.num = num;
        Ok(())
    }
    pub fn pull_strings(ctx: Context<PullStrings>, num: u64) -> anchor_lang::Result<()> {
        let cpi_program = ctx.accounts.puppet_program.to_account_info();
        let cpi_accounts = SetData {
            pu_account: ctx.accounts.puppet_account.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        puppet::cpi::set_data(cpi_ctx, num)
    }
    pub fn make_fixed_pda(ctx: Context<MakeFixedPda>) -> Result<()> {
        let my_pda = ctx.accounts.my_pda.deref_mut();
        let bump = ctx.bumps.my_pda;
        *my_pda = MyPda {
            authority: *ctx.accounts.authority.key,
            count: 0,
            bump,
        };
        Ok(())
    }
    pub fn increment_fixed_pda(ctx: Context<IncrementPda>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.my_pda.authority,
            ErrorCode::Unauthorized
        );
        ctx.accounts.my_pda.count += 1;
        Ok(())
    }
    pub fn make_dynamic_pda(ctx: Context<MakeDynamicPda>) -> Result<()> {
        let pda = &mut ctx.accounts.pda;
        pda.auth = *ctx.accounts.auth.key;
        pda.action = 100;
        Ok(())
    }
    pub fn reset_dynamic_pda(ctx: Context<ResetDynamicPda>) -> Result<()> {
        let pda = &mut ctx.accounts.pda;
        pda.action = 0;
        Ok(())
    }
}
#[derive(Accounts)]
pub struct MakeDynamicPda<'info> {
    #[account(
        init,
        payer = auth,
        space = 8 + Pda1::INIT_SPACE,
        seeds = [b"pda", auth.key().as_ref()],
        bump
    )]
    pub pda: Account<'info, Pda1>,
    #[account(mut)]
    pub auth: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[account]
#[derive(InitSpace)]
pub struct Pda1 {
    pub auth: Pubkey,
    pub action: u8,
}
#[derive(Accounts)]
pub struct ResetDynamicPda<'info> {
    // Only the auth on account pda, should be able to change state
    #[account(mut, has_one = auth)]
    pub pda: Account<'info, Pda1>,
    // mut makes it changeble (mutable)
    #[account(mut)]
    pub auth: Signer<'info>,
}

#[derive(Accounts)]
pub struct MakeFixedPda<'info> {
    #[account(
        init,
        payer = authority,
        space = MyPda::SIZE,
        seeds = [b"my_pda"],
        bump
    )]
    my_pda: Account<'info, MyPda>,
    #[account(mut)]
    authority: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct IncrementPda<'info> {
    #[account(
        mut,
        seeds = [b"my_pda"],
        bump = my_pda.bump
    )]
    my_pda: Account<'info, MyPda>,
    authority: Signer<'info>,
}
#[account]
pub struct MyPda {
    pub authority: Pubkey,
    pub count: u64,
    pub bump: u8,
}
impl MyPda {
    pub const SIZE: usize = 8 + 32 + 8 + 1;
}

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}

#[derive(Accounts)]
pub struct PullStrings<'info> {
    #[account(mut)]
    pub puppet_account: Account<'info, PuAccount>,
    pub puppet_program: Program<'info, Puppet>,
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
