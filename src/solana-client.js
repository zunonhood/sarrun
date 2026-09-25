import { createClient } from '@solana/kit'
import { solanaMainnetRpc } from '@solana/kit-plugin-rpc'
import { walletSigner } from '@solana/kit-plugin-wallet'

export const SOLANA_CHAIN = 'solana:mainnet'
export const SOLANA_EXPLORER = 'https://explorer.solana.com'

export const solanaClient = createClient()
  .use(walletSigner({ chain: SOLANA_CHAIN }))
  .use(solanaMainnetRpc({ rpcUrl: 'https://api.mainnet.solana.com' }))

export function solanaExplorerAddress(address) {
  return `${SOLANA_EXPLORER}/address/${address}`
}
