use anchor_lang::prelude::*;

declare_id!("2g5nWKEytXSfgznWR1UsJ1YMHBVK4ztKCxkGecg7CMXo");
//MUST be the same id declared in Anchor.toml

const USERNAME_LENGTH: usize = 100;

#[program]
pub mod social_media {
    use super::*;

    pub fn make_user_pda(
        ctx: Context<MakeUserPda>,
        _secretstr: String,
        username: String,
    ) -> Result<()> {
        let user_pda = &mut ctx.accounts.user_pda;
        user_pda.auth = *ctx.accounts.auth.key;
        user_pda.username = username;
        Ok(())
    }
    pub fn user_stake(ctx: Context<UserStake>, amount: u64) -> Result<()> {
        let user_pda = &mut ctx.accounts.user_pda;
        user_pda.staking_total += amount;
        let time_now: u32 = Clock::get().expect("err clock").unix_timestamp as u32;
        user_pda.timestamp = time_now;
        Ok(())
    }
}
#[derive(Accounts)]
#[instruction(secretstr: String)]
pub struct MakeUserPda<'info> {
    #[account(
        init,
        payer = auth,
        space = 8 + UserPda::INIT_SPACE,
        seeds = [secretstr.as_bytes(), b"user".as_ref(), auth.key().as_ref()],
        bump
    )]
    pub user_pda: Account<'info, UserPda>,
    #[account(mut)]
    pub auth: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[account]
#[derive(InitSpace)]
pub struct UserPda {
    #[max_len(USERNAME_LENGTH)]
    pub username: String,
    pub user_acct: Pubkey,
    pub staking_total: u64,
    pub timestamp: u32,
    //pub staking: [Staking; 20],
    pub auth: Pubkey,
}
#[derive(Accounts)]
pub struct UserStake<'info> {
    #[account(mut, has_one = auth)]
    pub user_pda: Account<'info, UserPda>,
    #[account(mut)]
    pub auth: Signer<'info>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}
