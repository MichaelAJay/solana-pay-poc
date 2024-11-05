import { PublicKey } from '@solana/web3.js';

export default () => ({
  acceptanceAccountPublicKey: new PublicKey(
    process.env.ACCEPTANCE_ACCOUNT_PUBLIC_KEY_STRING || '',
  ),
});
