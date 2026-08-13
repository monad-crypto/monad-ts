---
"@monad-crypto/mpp": patch
---

Fixed a check-then-act race where concurrent requests carrying the same credential could each be accepted, redeeming one on-chain payment more than once. The server now claims a hash before its first await, so at most one settlement and one delivery happen per credential.
