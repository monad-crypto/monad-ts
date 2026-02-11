/**
 * Appliction binary interface for the Monad staking precompile.
 *
 * @see {@link https://docs.monad.xyz/developer-essentials/staking/staking-precompile}
 *
 * @dev External view methods have "view" state mutability. This is not the same state
 * mutability that is used onchain. Onchain precompile functions all have "payable" or
 * "nonpayable" state mutability.
 */
export const stakingAbi = [
  {
    type: "function",
    name: "addValidator",
    inputs: [
      { name: "payload", type: "bytes", internalType: "bytes" },
      { name: "signedSecpMessage", type: "bytes", internalType: "bytes" },
      { name: "signedBlsMessage", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "validatorId", type: "uint64", internalType: "uint64" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "changeCommission",
    inputs: [
      { name: "validatorId", type: "uint64", internalType: "uint64" },
      { name: "commission", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimRewards",
    inputs: [{ name: "validatorId", type: "uint64", internalType: "uint64" }],
    outputs: [{ name: "success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "compound",
    inputs: [{ name: "validatorId", type: "uint64", internalType: "uint64" }],
    outputs: [{ name: "success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "delegate",
    inputs: [{ name: "validatorId", type: "uint64", internalType: "uint64" }],
    outputs: [{ name: "success", type: "bool", internalType: "bool" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "externalReward",
    inputs: [{ name: "validatorId", type: "uint64", internalType: "uint64" }],
    outputs: [{ name: "success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getConsensusValidatorSet",
    inputs: [{ name: "startIndex", type: "uint32", internalType: "uint32" }],
    outputs: [
      { name: "isDone", type: "bool", internalType: "bool" },
      { name: "nextIndex", type: "uint32", internalType: "uint32" },
      { name: "valIds", type: "uint64[]", internalType: "uint64[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDelegations",
    inputs: [
      { name: "delegator", type: "address", internalType: "address" },
      { name: "startValId", type: "uint64", internalType: "uint64" },
    ],
    outputs: [
      { name: "isDone", type: "bool", internalType: "bool" },
      { name: "nextValId", type: "uint64", internalType: "uint64" },
      { name: "valIds", type: "uint64[]", internalType: "uint64[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDelegator",
    inputs: [
      { name: "validatorId", type: "uint64", internalType: "uint64" },
      { name: "delegator", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "stake", type: "uint256", internalType: "uint256" },
      { name: "accRewardPerToken", type: "uint256", internalType: "uint256" },
      { name: "unclaimedRewards", type: "uint256", internalType: "uint256" },
      { name: "deltaStake", type: "uint256", internalType: "uint256" },
      { name: "nextDeltaStake", type: "uint256", internalType: "uint256" },
      { name: "deltaEpoch", type: "uint64", internalType: "uint64" },
      { name: "nextDeltaEpoch", type: "uint64", internalType: "uint64" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDelegators",
    inputs: [
      { name: "validatorId", type: "uint64", internalType: "uint64" },
      { name: "startDelegator", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "isDone", type: "bool", internalType: "bool" },
      { name: "nextDelegator", type: "address", internalType: "address" },
      { name: "delegators", type: "address[]", internalType: "address[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getEpoch",
    inputs: [],
    outputs: [
      { name: "epoch", type: "uint64", internalType: "uint64" },
      { name: "inEpochDelayPeriod", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProposerValId",
    inputs: [],
    outputs: [{ name: "val_id", type: "uint64", internalType: "uint64" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getExecutionValidatorSet",
    inputs: [{ name: "startIndex", type: "uint32", internalType: "uint32" }],
    outputs: [
      { name: "isDone", type: "bool", internalType: "bool" },
      { name: "nextIndex", type: "uint32", internalType: "uint32" },
      { name: "valIds", type: "uint64[]", internalType: "uint64[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSnapshotValidatorSet",
    inputs: [{ name: "startIndex", type: "uint32", internalType: "uint32" }],
    outputs: [
      { name: "isDone", type: "bool", internalType: "bool" },
      { name: "nextIndex", type: "uint32", internalType: "uint32" },
      { name: "valIds", type: "uint64[]", internalType: "uint64[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getValidator",
    inputs: [{ name: "validatorId", type: "uint64", internalType: "uint64" }],
    outputs: [
      { name: "authAddress", type: "address", internalType: "address" },
      { name: "flags", type: "uint64", internalType: "uint64" },
      { name: "stake", type: "uint256", internalType: "uint256" },
      { name: "accRewardPerToken", type: "uint256", internalType: "uint256" },
      { name: "commission", type: "uint256", internalType: "uint256" },
      { name: "unclaimedRewards", type: "uint256", internalType: "uint256" },
      { name: "consensusStake", type: "uint256", internalType: "uint256" },
      { name: "consensusCommission", type: "uint256", internalType: "uint256" },
      { name: "snapshotStake", type: "uint256", internalType: "uint256" },
      { name: "snapshotCommission", type: "uint256", internalType: "uint256" },
      { name: "secpPubkey", type: "bytes", internalType: "bytes" },
      { name: "blsPubkey", type: "bytes", internalType: "bytes" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWithdrawalRequest",
    inputs: [
      { name: "validatorId", type: "uint64", internalType: "uint64" },
      { name: "delegator", type: "address", internalType: "address" },
      { name: "withdrawId", type: "uint8", internalType: "uint8" },
    ],
    outputs: [
      { name: "withdrawalAmount", type: "uint256", internalType: "uint256" },
      { name: "accRewardPerToken", type: "uint256", internalType: "uint256" },
      { name: "withdrawEpoch", type: "uint64", internalType: "uint64" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "syscallOnEpochChange",
    inputs: [{ name: "epoch", type: "uint64", internalType: "uint64" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "syscallReward",
    inputs: [{ name: "blockAuthor", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "syscallSnapshot",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "undelegate",
    inputs: [
      { name: "validatorId", type: "uint64", internalType: "uint64" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "withdrawId", type: "uint8", internalType: "uint8" },
    ],
    outputs: [{ name: "success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "validatorId", type: "uint64", internalType: "uint64" },
      { name: "withdrawId", type: "uint8", internalType: "uint8" },
    ],
    outputs: [{ name: "success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "ClaimRewards",
    inputs: [
      {
        name: "validatorId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "delegator",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      { name: "epoch", type: "uint64", indexed: false, internalType: "uint64" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CommissionChanged",
    inputs: [
      {
        name: "validatorId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "oldCommission",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "newCommission",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Delegate",
    inputs: [
      {
        name: "validatorId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "delegator",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "activationEpoch",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EpochChanged",
    inputs: [
      {
        name: "oldEpoch",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "newEpoch",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Undelegate",
    inputs: [
      {
        name: "validatorId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "delegator",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "withdrawId",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "activationEpoch",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ValidatorCreated",
    inputs: [
      {
        name: "validatorId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "authAddress",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "commission",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ValidatorRewarded",
    inputs: [
      {
        name: "validatorId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      { name: "from", type: "address", indexed: true, internalType: "address" },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      { name: "epoch", type: "uint64", indexed: false, internalType: "uint64" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ValidatorStatusChanged",
    inputs: [
      {
        name: "validatorId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      { name: "flags", type: "uint64", indexed: false, internalType: "uint64" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdraw",
    inputs: [
      {
        name: "validatorId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "delegator",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "withdrawId",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "withdrawEpoch",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
] as const;

export const wmonAbi = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "src", type: "address" },
      { indexed: true, internalType: "address", name: "guy", type: "address" },
      { indexed: false, internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "dst", type: "address" },
      { indexed: false, internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "src", type: "address" },
      { indexed: true, internalType: "address", name: "dst", type: "address" },
      { indexed: false, internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "src", type: "address" },
      { indexed: false, internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "Withdrawal",
    type: "event",
  },
  { payable: true, stateMutability: "payable", type: "fallback" },
  {
    constant: true,
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "guy", type: "address" },
      { internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "deposit",
    outputs: [],
    payable: true,
    stateMutability: "payable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "dst", type: "address" },
      { internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "src", type: "address" },
      { internalType: "address", name: "dst", type: "address" },
      { internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "uint256", name: "wad", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * Address of monad staking precompile.
 *
 * @see {@link https://monadscan.com/address/0x0000000000000000000000000000000000001000}}
 */
export const STAKING_ADDRESS = "0x0000000000000000000000000000000000001000";

/**
 * Address of wrapped Monad token.
 *
 * @see {@link https://monadscan.com/address/0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A}
 */
export const WMON_ADDRESS = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";

export type { MonadActions } from "./decorator.js";
export { monadActions } from "./decorator.js";
export type {
  GetConsensusValidatorSetErrorType,
  GetConsensusValidatorSetParameters,
  GetConsensusValidatorSetReturnType,
} from "./getConsensusValidatorSet.js";
export { getConsensusValidatorSet } from "./getConsensusValidatorSet.js";
export type {
  GetDelegationsErrorType,
  GetDelegationsParameters,
  GetDelegationsReturnType,
} from "./getDelegations.js";
export { getDelegations } from "./getDelegations.js";
export type {
  GetDelegatorErrorType,
  GetDelegatorParameters,
  GetDelegatorReturnType,
} from "./getDelegator.js";
export { getDelegator } from "./getDelegator.js";
export type {
  GetDelegatorsErrorType,
  GetDelegatorsParameters,
  GetDelegatorsReturnType,
} from "./getDelegators.js";
export { getDelegators } from "./getDelegators.js";
export type {
  GetEpochErrorType,
  GetEpochParameters,
  GetEpochReturnType,
} from "./getEpoch.js";
export { getEpoch } from "./getEpoch.js";
export type {
  GetExecutionValidatorSetErrorType,
  GetExecutionValidatorSetParameters,
  GetExecutionValidatorSetReturnType,
} from "./getExecutionValidatorSet.js";
export { getExecutionValidatorSet } from "./getExecutionValidatorSet.js";
export type {
  GetProposerValIdErrorType,
  GetProposerValIdParameters,
  GetProposerValIdReturnType,
} from "./getProposerValId.js";
export { getProposerValId } from "./getProposerValId.js";
export type {
  GetSnapshotValidatorSetErrorType,
  GetSnapshotValidatorSetParameters,
  GetSnapshotValidatorSetReturnType,
} from "./getSnapshotValidatorSet.js";
export { getSnapshotValidatorSet } from "./getSnapshotValidatorSet.js";
export type {
  GetValidatorErrorType,
  GetValidatorParameters,
  GetValidatorReturnType,
} from "./getValidator.js";
export { getValidator } from "./getValidator.js";
export type {
  GetWithdrawalRequestErrorType,
  GetWithdrawalRequestParameters,
  GetWithdrawalRequestReturnType,
} from "./getWithdrawalRequest.js";
export { getWithdrawalRequest } from "./getWithdrawalRequest.js";
export type {
  GetWmonAllowanceErrorType,
  GetWmonAllowanceParameters,
  GetWmonAllowanceReturnType,
} from "./getWmonAllowance.js";
export { getWmonAllowance } from "./getWmonAllowance.js";
export type {
  GetWmonBalanceOfErrorType,
  GetWmonBalanceOfParameters,
  GetWmonBalanceOfReturnType,
} from "./getWmonBalanceOf.js";
export { getWmonBalanceOf } from "./getWmonBalanceOf.js";
export type {
  GetWmonDecimalsErrorType,
  GetWmonDecimalsParameters,
  GetWmonDecimalsReturnType,
} from "./getWmonDecimals.js";
export { getWmonDecimals } from "./getWmonDecimals.js";
export type {
  GetWmonNameErrorType,
  GetWmonNameParameters,
  GetWmonNameReturnType,
} from "./getWmonName.js";
export { getWmonName } from "./getWmonName.js";
export type {
  GetWmonSymbolErrorType,
  GetWmonSymbolParameters,
  GetWmonSymbolReturnType,
} from "./getWmonSymbol.js";
export { getWmonSymbol } from "./getWmonSymbol.js";
