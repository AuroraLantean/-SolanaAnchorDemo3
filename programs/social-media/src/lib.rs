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
    pub fn make_large_account(_ctx: Context<MakeLargeAccount>) -> Result<()> {
        Ok(())
    }
    //TODO: how to prevent hacker attack here?
    pub fn set_large_account(ctx: Context<UpdateLargeAccount>) -> Result<()> {
        let stake_array = &mut ctx.accounts.stake_array.load_mut()?;
        stake_array.auth = ctx.accounts.auth.to_account_info().key();
        Ok(())
    }

    pub fn update_large_account(
        ctx: Context<UpdateLargeAccount>,
        pool_id: u32,
        amount: u64,
        share: u64,
        reward: u64,
    ) -> Result<()> {
        let stake_array = &mut ctx.accounts.stake_array.load_mut()?;

        if ctx.accounts.auth.to_account_info().key() != stake_array.auth.key() {
            return Err(ErrorCode::Unauthorized.into());
        }
        stake_array.stakes[pool_id as usize] = Stake {
            amount,
            share,
            reward, //auth: *ctx.accounts.auth.key,
        };
        Ok(())
    }

    /*     pub fn make_stake_account(_ctx: Context<MakeStakeAccount>) -> Result<()> {
        Ok(())
    } */
}
#[derive(Accounts)]
pub struct UpdateLargeAccount<'info> {
    #[account(mut)]
    stake_array: AccountLoader<'info, StakeArray>,
    auth: Signer<'info>,
}
#[derive(Accounts)]
pub struct MakeLargeAccount<'info> {
    #[account(zero)]
    stake_array: AccountLoader<'info, StakeArray>,
}
#[account(zero_copy)]
pub struct StakeArray {
    pub auth: Pubkey,
    pub stakes: [Stake; 25000],
}

#[derive(Accounts)]
pub struct SetStake<'info> {
    authority: Signer<'info>,
}

#[zero_copy]
pub struct Stake {
    pub amount: u64, //have to match number types below
    pub share: u64,
    pub reward: u64,
}
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RpcStake {
    pub amount: u64,
    pub share: u64,
    pub reward: u64,
}

impl From<RpcStake> for Stake {
    fn from(e: RpcStake) -> Stake {
        Stake {
            amount: e.amount,
            share: e.share,
            reward: e.reward,
        }
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
