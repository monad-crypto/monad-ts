---
"@monad-crypto/mpp": patch
---

Require `decimals` for currencies other than USDC and USDT0 instead of defaulting to 6, which silently produced wrong amounts for tokens with different decimals.
