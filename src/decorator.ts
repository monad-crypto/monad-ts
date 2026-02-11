import type { Chain, Client, Transport } from "viem";
import {
  type GetStakingConsensusValidatorSetParameters,
  type GetStakingConsensusValidatorSetReturnType,
  getStakingConsensusValidatorSet,
} from "./getStakingConsensusValidatorSet.js";
import {
  type GetStakingDelegationsParameters,
  type GetStakingDelegationsReturnType,
  getStakingDelegations,
} from "./getStakingDelegations.js";
import {
  type GetStakingDelegatorParameters,
  type GetStakingDelegatorReturnType,
  getStakingDelegator,
} from "./getStakingDelegator.js";
import {
  type GetStakingDelegatorsParameters,
  type GetStakingDelegatorsReturnType,
  getStakingDelegators,
} from "./getStakingDelegators.js";
import {
  type GetStakingEpochParameters,
  type GetStakingEpochReturnType,
  getStakingEpoch,
} from "./getStakingEpoch.js";
import {
  type GetStakingExecutionValidatorSetParameters,
  type GetStakingExecutionValidatorSetReturnType,
  getStakingExecutionValidatorSet,
} from "./getStakingExecutionValidatorSet.js";
import {
  type GetStakingProposerValIdParameters,
  type GetStakingProposerValIdReturnType,
  getStakingProposerValId,
} from "./getStakingProposerValId.js";
import {
  type GetStakingSnapshotValidatorSetParameters,
  type GetStakingSnapshotValidatorSetReturnType,
  getStakingSnapshotValidatorSet,
} from "./getStakingSnapshotValidatorSet.js";
import {
  type GetStakingValidatorParameters,
  type GetStakingValidatorReturnType,
  getStakingValidator,
} from "./getStakingValidator.js";
import {
  type GetStakingWithdrawalRequestParameters,
  type GetStakingWithdrawalRequestReturnType,
  getStakingWithdrawalRequest,
} from "./getStakingWithdrawalRequest.js";

export type MonadActions = {
  /**
   * Returns a validator's complete state across execution, consensus, and snapshot contexts.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getvalidator
   *
   * @param parameters - {@link GetStakingValidatorParameters}
   * @returns Validator state including auth address, flags, stake, accumulator, commission, unclaimed rewards, consensus/snapshot stake and commission, and public keys. {@link GetStakingValidatorReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monad } from 'viem/chains'
   * import { getStakingValidator } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monad,
   *   transport: http(),
   * })
   *
   * const validator = await getStakingValidator(client, {
   *   args: [1n],
   * })
   * ```
   */
  getStakingValidator: (
    parameters: GetStakingValidatorParameters,
  ) => Promise<GetStakingValidatorReturnType>;
  /**
   * Returns a delegator's stake, accumulated rewards, and pending stake changes for a specified validator.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegator
   *
   * @param parameters - {@link GetStakingDelegatorParameters}
   * @returns Delegator's active stake, accumulator, unclaimed rewards, and pending delta stakes and epochs. {@link GetStakingDelegatorReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monad } from 'viem/chains'
   * import { getStakingDelegator } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monad,
   *   transport: http(),
   * })
   *
   * const delegator = await getStakingDelegator(client, {
   *   args: [1n, '0x...'],
   * })
   * ```
   */
  getStakingDelegator: (
    parameters: GetStakingDelegatorParameters,
  ) => Promise<GetStakingDelegatorReturnType>;
  /**
   * Returns the pending withdrawal request for a (validatorId, delegator, withdrawId) tuple.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getwithdrawalrequest
   *
   * @param parameters - {@link GetStakingWithdrawalRequestParameters}
   * @returns Withdrawal amount, accumulator value at time of undelegation, and the epoch when the withdrawal becomes claimable. {@link GetStakingWithdrawalRequestReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monad } from 'viem/chains'
   * import { getStakingWithdrawalRequest } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monad,
   *   transport: http(),
   * })
   *
   * const withdrawal = await getStakingWithdrawalRequest(client, {
   *   args: [1n, '0x...', 0],
   * })
   * ```
   */
  getStakingWithdrawalRequest: (
    parameters: GetStakingWithdrawalRequestParameters,
  ) => Promise<GetStakingWithdrawalRequestReturnType>;
  /**
   * Returns the consensus validator set IDs. Results are paginated; when `isDone` is false, call again with `nextIndex` as `startIndex`.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
   *
   * @param parameters - {@link GetStakingConsensusValidatorSetParameters}
   * @returns `(isDone, nextIndex, valIds)` tuple of consensus validator IDs. {@link GetStakingConsensusValidatorSetReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monad } from 'viem/chains'
   * import { getStakingConsensusValidatorSet } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monad,
   *   transport: http(),
   * })
   *
   * const result = await getStakingConsensusValidatorSet(client, {
   *   args: [0],
   * })
   * ```
   */
  getStakingConsensusValidatorSet: (
    parameters: GetStakingConsensusValidatorSetParameters,
  ) => Promise<GetStakingConsensusValidatorSetReturnType>;
  /**
   * Returns the snapshot validator set IDs. Results are paginated; when `isDone` is false, call again with `nextIndex` as `startIndex`.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
   *
   * @param parameters - {@link GetStakingSnapshotValidatorSetParameters}
   * @returns `(isDone, nextIndex, valIds)` tuple of snapshot validator IDs. {@link GetStakingSnapshotValidatorSetReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monad } from 'viem/chains'
   * import { getStakingSnapshotValidatorSet } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monad,
   *   transport: http(),
   * })
   *
   * const result = await getStakingSnapshotValidatorSet(client, {
   *   args: [0],
   * })
   * ```
   */
  getStakingSnapshotValidatorSet: (
    parameters: GetStakingSnapshotValidatorSetParameters,
  ) => Promise<GetStakingSnapshotValidatorSetReturnType>;
  /**
   * Returns the execution validator set IDs. Results are paginated; when `isDone` is false, call again with `nextIndex` as `startIndex`.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
   *
   * @param parameters - {@link GetStakingExecutionValidatorSetParameters}
   * @returns `(isDone, nextIndex, valIds)` tuple of execution validator IDs. {@link GetStakingExecutionValidatorSetReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monad } from 'viem/chains'
   * import { getStakingExecutionValidatorSet } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monad,
   *   transport: http(),
   * })
   *
   * const result = await getStakingExecutionValidatorSet(client, {
   *   args: [0],
   * })
   * ```
   */
  getStakingExecutionValidatorSet: (
    parameters: GetStakingExecutionValidatorSetParameters,
  ) => Promise<GetStakingExecutionValidatorSetReturnType>;
  /**
   * Returns the validator IDs to which an address has delegated. Results are paginated; when `isDone` is false, call again with `nextValId` as `startValId`.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegations
   *
   * @param parameters - {@link GetStakingDelegationsParameters}
   * @returns `(isDone, nextValId, valIds)` tuple of validator IDs the address has delegated to. {@link GetStakingDelegationsReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monad } from 'viem/chains'
   * import { getStakingDelegations } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monad,
   *   transport: http(),
   * })
   *
   * const result = await getStakingDelegations(client, {
   *   args: ['0x...', 0n],
   * })
   * ```
   */
  getStakingDelegations: (
    parameters: GetStakingDelegationsParameters,
  ) => Promise<GetStakingDelegationsReturnType>;
  /**
   * Returns the delegator addresses for a given validator. Results are paginated; when `isDone` is false, call again with `nextDelegator` as `startDelegator`.
   *
   * @dev The number of delegators can be very large; consider maintaining an updated list via events rather than periodically calling this.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegators
   *
   * @param parameters - {@link GetStakingDelegatorsParameters}
   * @returns `(isDone, nextDelegator, delegators)` tuple of delegator addresses. {@link GetStakingDelegatorsReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monad } from 'viem/chains'
   * import { getStakingDelegators } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monad,
   *   transport: http(),
   * })
   *
   * const result = await getStakingDelegators(client, {
   *   args: [1n, '0x0000000000000000000000000000000000000000'],
   * })
   * ```
   */
  getStakingDelegators: (
    parameters: GetStakingDelegatorsParameters,
  ) => Promise<GetStakingDelegatorsReturnType>;
  /**
   * Returns the current epoch and whether the network is in the epoch delay period. If `inEpochDelayPeriod` is false, write operations are effective for `epoch + 1`; if true, for `epoch + 2`.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getepoch
   *
   * @returns `(epoch, inEpochDelayPeriod)` tuple. {@link GetStakingEpochReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monad } from 'viem/chains'
   * import { getStakingEpoch } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monad,
   *   transport: http(),
   * })
   *
   * const [epoch, inEpochDelayPeriod] = await getStakingEpoch(client)
   * ```
   */
  getStakingEpoch: (
    parameters?: GetStakingEpochParameters,
  ) => Promise<GetStakingEpochReturnType>;
  /**
   * Returns the validator ID of the current block proposer, corresponding to the SECP value of the block author.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getproposervalid
   *
   * @returns Validator ID of the current block proposer. {@link GetStakingProposerValIdReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monad } from 'viem/chains'
   * import { getStakingProposerValId } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monad,
   *   transport: http(),
   * })
   *
   * const proposerValId = await getStakingProposerValId(client)
   * ```
   */
  getStakingProposerValId: (
    parameters?: GetStakingProposerValIdParameters,
  ) => Promise<GetStakingProposerValIdReturnType>;
};

/**
 * Actions for interacting with the Monad staking precompile.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { monadActions } from 'monad-ts-docs'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * }).extend(monadActions())
 *
 * const validator = await client.getStakingValidator({ args: [1n] })
 * ```
 */
export function monadActions() {
  return <chain extends Chain | undefined>(
    client: Client<Transport, chain>,
  ): MonadActions => {
    return {
      getStakingValidator: (parameters) =>
        getStakingValidator(client, parameters),
      getStakingDelegator: (parameters) =>
        getStakingDelegator(client, parameters),
      getStakingWithdrawalRequest: (parameters) =>
        getStakingWithdrawalRequest(client, parameters),
      getStakingConsensusValidatorSet: (parameters) =>
        getStakingConsensusValidatorSet(client, parameters),
      getStakingSnapshotValidatorSet: (parameters) =>
        getStakingSnapshotValidatorSet(client, parameters),
      getStakingExecutionValidatorSet: (parameters) =>
        getStakingExecutionValidatorSet(client, parameters),
      getStakingDelegations: (parameters) =>
        getStakingDelegations(client, parameters),
      getStakingDelegators: (parameters) =>
        getStakingDelegators(client, parameters),
      getStakingEpoch: (parameters) => getStakingEpoch(client, parameters),
      getStakingProposerValId: (parameters) =>
        getStakingProposerValId(client, parameters),
    };
  };
}
