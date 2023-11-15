use anchor_lang::prelude::*;
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
