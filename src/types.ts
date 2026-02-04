import type { Address, Hex } from "viem";

export type DelegateParameters = {
  validatorId: bigint;
  value: bigint;
};

export type UndelegateParameters = {
  validatorId: bigint;
  amount: bigint;
  withdrawId: number;
};

export type WithdrawParameters = {
  validatorId: bigint;
  withdrawId: number;
};

export type CompoundParameters = {
  validatorId: bigint;
};

export type ClaimRewardsParameters = {
  validatorId: bigint;
};

export type ChangeCommissionParameters = {
  validatorId: bigint;
  commission: bigint;
};

export type ExternalRewardParameters = {
  validatorId: bigint;
  value: bigint;
};

export type GetValidatorParameters = {
  validatorId: bigint;
};

export type GetValidatorReturnType = {
  authAddress: Address;
  flags: bigint;
  stake: bigint;
  accRewardPerToken: bigint;
  commission: bigint;
  unclaimedRewards: bigint;
  consensusStake: bigint;
  consensusCommission: bigint;
  snapshotStake: bigint;
  snapshotCommission: bigint;
  secpPubkey: Hex;
  blsPubkey: Hex;
};

export type GetDelegatorParameters = {
  validatorId: bigint;
  delegator: Address;
};

export type GetDelegatorReturnType = {
  stake: bigint;
  accRewardPerToken: bigint;
  unclaimedRewards: bigint;
  deltaStake: bigint;
  nextDeltaStake: bigint;
  deltaEpoch: bigint;
  nextDeltaEpoch: bigint;
};

export type GetWithdrawalRequestParameters = {
  validatorId: bigint;
  delegator: Address;
  withdrawId: number;
};

export type GetWithdrawalRequestReturnType = {
  withdrawalAmount: bigint;
  accRewardPerToken: bigint;
  withdrawEpoch: bigint;
};

export type GetValidatorSetParameters = {
  startIndex: number;
};

export type GetValidatorSetReturnType = {
  isDone: boolean;
  nextIndex: number;
  valIds: readonly bigint[];
};

export type GetDelegationsParameters = {
  delegator: Address;
  startValId: bigint;
};

export type GetDelegationsReturnType = {
  isDone: boolean;
  nextValId: bigint;
  valIds: readonly bigint[];
};

export type GetDelegatorsParameters = {
  validatorId: bigint;
  startDelegator: Address;
};

export type GetDelegatorsReturnType = {
  isDone: boolean;
  nextDelegator: Address;
  delegators: readonly Address[];
};

export type GetEpochReturnType = {
  epoch: bigint;
  inEpochDelayPeriod: boolean;
};
