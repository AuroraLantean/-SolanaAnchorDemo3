use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{self, MintTo, Token, Transfer, TokenAccount, Mint};
//https://docs.rs/anchor-spl/latest/anchor_spl/token/index.html

declare_id!("AJFx3LkR7oyUE6uWXMTRa5QnR4TXqKkFskJkDzxh5gF5");

#[derive(Accounts)]
pub struct MintToken<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub to_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub auth: Signer<'info>,
}
#[derive(Accounts)]
pub struct TransferTokenWithTokenPda<'info> {
    #[account(mut)]
    pub user_tpda: Account<'info, TokenAccount>,
    pub user_pda: Account<'info, UserPda>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub auth: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct InitTokenPda<'info> {
    #[account(init, payer = auth, 
      seeds = [auth.key().as_ref(), from_ata.key().as_ref()], bump, token::mint = mint,
      token::authority = user_pda, )]
    pub user_tpda: Account<'info, TokenAccount>,
    pub user_pda: Account<'info, UserPda>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub from_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub auth: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
#[program]
pub mod token_contract {
    use super::*;
    pub fn transfer_token_from_token_pda(ctx: Context<TransferTokenWithTokenPda>, amount:u64, user_pda_bump: u8) -> Result<()>
    {
      msg!("transfer_token_from_token_pda...");
      let cpi_accounts = Transfer {
        from: ctx.accounts.user_tpda.to_account_info(),
        to: ctx.accounts.ata.to_account_info(),
        authority: ctx.accounts.user_pda.to_account_info(),// user_pda!
      };
      msg!("transfer_tokens_to_new_pda()...2");
      let seeds = &[b"userpda".as_ref(), ctx.accounts.auth.key.as_ref(), &[user_pda_bump], ];
      let signer_seeds = &[&seeds[..]];
      
      msg!("transfer_token_from_token_pda()...3");
      let cpi_program = ctx.accounts.token_program.to_account_info();
      // Create the Context for our Transfer request
      let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

      msg!("transfer_token_from_token_pda()...4");
      anchor_spl::token::transfer(cpi_ctx, amount.into())?;
      Ok(())
    }
    pub fn init_token_pda(_ctx: Context<InitTokenPda>) -> Result<()> {
      msg!("init_token_pda initialised");
      Ok(())
    }
    pub fn transfer_token_to_token_pda(
      ctx: Context<TransferTokenWithTokenPda>,
      amount: u64,
    ) -> Result<()> {
        msg!("transfer_tokens_to_pda()... amount={:?}", amount);
        //let user_pda = &mut ctx.accounts.user_pda;
        // https://docs.rs/anchor-spl/latest/anchor_spl/token/struct.Transfer.html
        let cpi_accounts = Transfer {
          from: ctx.accounts.ata.to_account_info(),
          to: ctx.accounts.user_tpda.to_account_info(),
          authority: ctx.accounts.auth.to_account_info(),
      };//token::transfer(ctx.accounts.transfer_ctx(), amount)?;
      msg!("transfer_tokens_to_new_pda()...2");
      let cpi_program = ctx.accounts.token_program.to_account_info();
      // Create the Context for our Transfer request
      let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
      msg!("transfer_tokens_to_new_pda()...3");

      anchor_spl::token::transfer(cpi_ctx, amount.into())?;
        Ok(())
    }
    pub fn mint_token(ctx: Context<MintToken>, amount: u32) -> Result<()> {
        // Create the MintTo struct for our context https://docs.rs/anchor-spl/latest/anchor_spl/token/struct.MintTo.html
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.to_ata.to_account_info(),
            authority: ctx.accounts.auth.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        // Create the CpiContext we need for the request
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        //https://docs.rs/anchor-spl/latest/anchor_spl/token/fn.mint_to.html
        token::mint_to(cpi_ctx, amount.into())?;
        Ok(())
    }

    //TODO: avoid using from and to together as input. Use PDA as an intermediary instead
    pub fn transfer_token(ctx: Context<TransferToken>, amount: u32) -> Result<()> {
      msg!("starting tokens: {}, {}", ctx.accounts.from_ata.amount, ctx.accounts.to_ata.amount);
        // https://docs.rs/anchor-spl/latest/anchor_spl/token/struct.Transfer.html
        let cpi_accounts = Transfer {
            from: ctx.accounts.from_ata.to_account_info(),
            to: ctx.accounts.to_ata.to_account_info(),
            authority: ctx.accounts.auth.to_account_info(),
        };//token::transfer(ctx.accounts.transfer_ctx(), amount)?;

        let cpi_program = ctx.accounts.token_program.to_account_info();
        // Create the Context for our Transfer request
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        anchor_spl::token::transfer(cpi_ctx, amount.into())?;
        ctx.accounts.from_ata.reload()?;
        msg!("remaining tokens: {}, {}", ctx.accounts.from_ata.amount, ctx.accounts.to_ata.amount);
        Ok(())
    }
    pub fn init_user_pda(ctx: Context<InitUserPda>,
    ) -> Result<()> {
      msg!("init_user_pda()");
      let user_pda = &mut ctx.accounts.user_pda;
      user_pda.auth = *ctx.accounts.auth.key;
      Ok(())
    }
    pub fn transfer_lamport_to_pda(
      ctx: Context<TransferLamportToPda>,
      amount: u64,
    ) -> Result<()> {
      msg!("transfer_lamport_to_pda()... amount={:?}", amount);
      let user_pda = &mut ctx.accounts.user_pda;
      user_pda.deposit += amount;

      let from = &ctx.accounts.auth;
      let instruction = system_instruction::transfer(from.key, &user_pda.key(), amount);

      invoke_signed(
          &instruction,
          &[
              from.to_account_info(),
              user_pda.to_account_info(),
              ctx.accounts.system_program.to_account_info(),
          ],
          &[],
      )?;
      Ok(())
  }

  pub fn transfer_lamport_from_pda(
      ctx: Context<TransferLamportFromPda>,
      amount: u64,
      bump: u8,
  ) -> Result<()> {
      msg!("transfer_lamport_from_pda()... amount={:?}, bump={:?}", amount, bump);
      let user_pda = &mut ctx.accounts.user_pda;
      if user_pda.deposit < amount {
        return Err(CustomError::InsufficientDeposit.into());
      }
      user_pda.deposit -= amount;
      msg!("transfer_lamport_from_pda()...2");
      
      let from_account = &user_pda.to_account_info();
      let to_account = &ctx.accounts.auth.to_account_info();
      if **from_account.try_borrow_lamports()? < amount {
        return Err(CustomError::InsufficientLamports.into());
    }// Debit from_account and credit to_account
    **from_account.try_borrow_mut_lamports()? -= amount;
    **to_account.try_borrow_mut_lamports()? += amount;
    Ok(())
  }
  /*    from pda
  let instruction = system_instruction::transfer(&user_pda.key(), auth.key, amount);
      msg!("transfer_lamports_from_pda()...3");
      let seeds = &["userpda".as_bytes(), auth.key.as_ref(), &[bump]];
      msg!("transfer_lamports_from_pda()...4");
      invoke_signed(
          &instruction,
          &[
              user_pda.to_account_info(),
              auth.to_account_info(),
              //ctx.accounts.system_program.to_account_info(),
          ],
          &[&seeds[..]],
      )?;
   */
}
//#[instruction(bump : u8)]
#[derive(Accounts)]
pub struct TransferLamportFromPda<'info> {
    #[account(mut, has_one = auth)]
    pub user_pda: Account<'info, UserPda>,
    #[account(mut)]
    pub auth: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct InitUserPda<'info> {
  #[account(init, payer = auth, 
    space = 8 + UserPda::INIT_SPACE, 
    seeds = [b"userpda".as_ref(), auth.key().as_ref()], bump )]
    pub user_pda: Account<'info, UserPda>,
    #[account(mut)]
    pub auth: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct TransferLamportToPda<'info> {
    #[account(mut)]
    pub user_pda: Account<'info, UserPda>,
    #[account(mut)]
    pub auth: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[account]
#[derive(InitSpace)]
pub struct UserPda {
    pub auth: Pubkey,
    pub deposit: u64,
}
#[account]
#[derive(InitSpace)]
pub struct UserTokpda {
    pub auth: Pubkey,
    pub deposit: u64,
}

#[derive(Accounts)]
pub struct TransferToken<'info> {
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub from_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to_ata: Account<'info, TokenAccount>,
    pub auth: Signer<'info>,
}
impl<'info> TransferToken<'info> {
  fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
      CpiContext::new(
          self.token_program.to_account_info(),
          Transfer {
              from: self.from_ata.to_account_info(),
              to: self.to_ata.to_account_info(),
              authority: self.auth.to_account_info(),
          },
      )
  }
}
#[error_code]
pub enum CustomError {
    #[msg("not authorized")]
    Unauthorized,
    #[msg("deposit not enough")]
    InsufficientDeposit,
    #[msg("insufficient lamports")]
    InsufficientLamports,
    #[msg("insufficient tokens")]
    InsufficientTokens,
}