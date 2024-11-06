import { PublicKey } from '@solana/web3.js';

export default () => ({
  acceptanceAccountPublicKey: new PublicKey(
    process.env.ACCEPTANCE_ACCOUNT_PUBLIC_KEY_STRING || '',
  ),
  mintAccountPublicKey: new PublicKey(
    process.env.SPL_TOKEN_MINT_ACCOUNT_BASE58_ENCODED_PUBLIC_KEY || '',
  ),
});
