use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{self, MintTo, Token, Transfer};
//https://docs.rs/anchor-spl/latest/anchor_spl/token/index.html

declare_id!("AJFx3LkR7oyUE6uWXMTRa5QnR4TXqKkFskJkDzxh5gF5");

#[derive(Accounts)]
pub struct MintToken<'info> {
    /// CHECK: This is the token that we want to mint
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    /// CHECK: This is the token account that we want to mint tokens to
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,
    /// CHECK: the authority of the mint account
    #[account(mut)]
    pub authority: AccountInfo<'info>,
}
#[program]
pub mod token_contract {
    use super::*;

    pub fn mint_token(ctx: Context<MintToken>, amount: u32) -> Result<()> {
        // Create the MintTo struct for our context https://docs.rs/anchor-spl/latest/anchor_spl/token/struct.MintTo.html
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
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
        // https://docs.rs/anchor-spl/latest/anchor_spl/token/struct.Transfer.html
        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.from_authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        // Create the Context for our Transfer request
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        anchor_spl::token::transfer(cpi_ctx, amount.into())?;
        Ok(())
    }
    pub fn transfer_lamports_to_new_pda(
      ctx: Context<TransferLamportsToPda>,
      amount: u64,
  ) -> Result<()> {
      msg!("transfer_lamports_to_pda()... amount={:?}", amount);
      let user_pda = &mut ctx.accounts.user_pda;
      user_pda.auth = *ctx.accounts.auth.key;
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
      
      /*let auth = ctx.accounts.auth.key();
      let bump1 = bump.to_le_bytes();
      let inner = vec![auth.as_ref(), bump1.as_ref()];
      let outer_sol = vec![inner.as_slice()];
      let instruction = system_instruction::transfer(&auth, &user_pda.key(), amount);
      invoke_signed(
          &instruction,
          &[
              ctx.accounts.auth.to_account_info(),
              user_pda.to_account_info(),
          ],
          outer_sol.as_slice(),
      )?;*/
      Ok(())
  }
  pub fn transfer_lamports_from_pda(
      ctx: Context<TransferLamportsFromPda>,
      amount: u64,
      bump: u8,
  ) -> Result<()> {
      msg!("transfer_lamports_from_pda()... amount={:?}, bump={:?}", amount, bump);
      let user_pda = &mut ctx.accounts.user_pda;
      if user_pda.deposit < amount {
        return Err(CustomError::InsufficientDeposit.into());
      }
      user_pda.deposit -= amount;
      msg!("transfer_lamports_from_pda()...2");
      
      let from_account = &user_pda.to_account_info();
      let to_account = &ctx.accounts.auth.to_account_info();
      if **from_account.try_borrow_lamports()? < amount {
        return Err(CustomError::InsufficientLamportsForTransaction.into());
    }// Debit from_account and credit to_account
    **from_account.try_borrow_mut_lamports()? -= amount;
    **to_account.try_borrow_mut_lamports()? += amount;
      
      /*let instruction = system_instruction::transfer(&user_pda.key(), auth.key, amount);
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
 */      Ok(())
  }
}
//#[instruction(bump : u8)]
#[derive(Accounts)]
pub struct TransferLamportsFromPda<'info> {
    #[account(mut, has_one = auth)]
    pub user_pda: Account<'info, UserPda>,
    #[account(mut)]
    pub auth: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct TransferLamportsToPda<'info> {
    #[account(init, payer = auth, 
      space = 8 + UserPda::INIT_SPACE, 
      seeds = [b"userpda".as_ref(), auth.key().as_ref()], bump )]
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

#[derive(Accounts)]
pub struct TransferToken<'info> {
    pub token_program: Program<'info, Token>,
    /// CHECK: The associated token account that we are transferring the token from
    #[account(mut)]
    pub from: UncheckedAccount<'info>,
    /// CHECK: The associated token account that we are transferring the token to
    #[account(mut)]
    pub to: AccountInfo<'info>,
    // the authority of the from account
    pub from_authority: Signer<'info>,
}
#[error_code]
pub enum CustomError {
    #[msg("not authorized")]
    Unauthorized,
    #[msg("deposit not enough")]
    InsufficientDeposit,
    #[msg("insufficient lamports")]
    InsufficientLamportsForTransaction,
}