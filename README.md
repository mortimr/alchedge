# Alchemix Powered Hedging

These smart contracts help the user convert their `alUSD` into a Hegic Option of their choice.

## ITBD.sol

This interface is used by both the BTC and the ETH contracts. It defines all the utility functions required for the process to work. The only state modifying method is `purchaseOptionWithAlUSD`

## ITBDBTC.sol & ITBDBTC.sol

These two contracts hold all the logic required to convert alUSD into an Option.

### Curve Swap

The main alUSD market is on curve, the first step of the process is to retrieve `Dai` by using curve.

### Uniswap Swap

Once the `Dai` is retrieved, we need to swap for `Eth` on Uniswap. There is an invisible fee protection parameter called `minEth` that defines the minimal amount of `Eth` that should be received at the end of the swaps. This ensures there is no big price divergences.

### Option Purchase

Hegic's fee model is reversed in the `getAmount` utility function. The result tells us what amount of option can be purchased for a given amount of `Eth` we are willing to pay.

## Tests

To run smart contract tests, you will need an ethereum rpc endpoint. The tests are running on a mainnet fork and currently only work with the hard coded block number from the config (as checked values change if the oracle prices change too). I suggest using an Alchemy endpoint.

```
env FORK=true FORK_ETHEREUM_RPC_URL=<url> npx hardhat test
```