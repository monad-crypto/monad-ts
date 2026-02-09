import type { Chain, Client, Transport } from "viem";
import {
  type GetConsensusValidatorSetParameters,
  type GetConsensusValidatorSetReturnType,
  getConsensusValidatorSet,
} from "./getConsensusValidatorSet.ts";
import {
  type GetDelegationsParameters,
  type GetDelegationsReturnType,
  getDelegations,
} from "./getDelegations.ts";
import {
  type GetDelegatorParameters,
  type GetDelegatorReturnType,
  getDelegator,
} from "./getDelegator.ts";
import {
  type GetDelegatorsParameters,
  type GetDelegatorsReturnType,
  getDelegators,
} from "./getDelegators.ts";
import {
  type GetEpochParameters,
  type GetEpochReturnType,
  getEpoch,
} from "./getEpoch.ts";
import {
  type GetExecutionValidatorSetParameters,
  type GetExecutionValidatorSetReturnType,
  getExecutionValidatorSet,
} from "./getExecutionValidatorSet.ts";
import {
  type GetProposerValIdParameters,
  type GetProposerValIdReturnType,
  getProposerValId,
} from "./getProposerValId.ts";
import {
  type GetSnapshotValidatorSetParameters,
  type GetSnapshotValidatorSetReturnType,
  getSnapshotValidatorSet,
} from "./getSnapshotValidatorSet.ts";
import {
  type GetValidatorParameters,
  type GetValidatorReturnType,
  getValidator,
} from "./getValidator.ts";
import {
  type GetWithdrawalRequestParameters,
  type GetWithdrawalRequestReturnType,
  getWithdrawalRequest,
} from "./getWithdrawalRequest.ts";

/**
 * Actions for interacting with the Monad staking precompile.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monadTestnet } from 'viem/chains'
 * import { monadActions } from 'monad-ts-docs'
 *
 * const client = createClient({
 *   chain: monadTestnet,
 *   transport: http(),
 * }).extend(monadActions())
 *
 * const validator = await client.getValidator({ args: [1n] })
 * ```
 */
export type MonadActions = {
  /**
   * Returns the complete state of a validator across execution, consensus, and snapshot contexts.
   *
   * - Includes the validator's auth address, flags, stake, accumulator, commission, unclaimed rewards, consensus/snapshot stake and commission, and public keys.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getvalidator
   *
   * @param parameters - {@link GetValidatorParameters}
   * @returns Validator state. {@link GetValidatorReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monadTestnet } from 'viem/chains'
   * import { getValidator } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monadTestnet,
   *   transport: http(),
   * })
   *
   * const validator = await getValidator(client, {
   *   args: [1n],
   * })
   * ```
   */
  getValidator: (
    parameters: GetValidatorParameters,
  ) => Promise<GetValidatorReturnType>;
  /**
   * Returns a delegator's stake, accumulated rewards, and pending stake changes for a specified validator.
   *
   * - Provides a view of the delegator's active stake, accumulator, unclaimed rewards, and pending delta stakes and epochs.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegator
   *
   * @param parameters - {@link GetDelegatorParameters}
   * @returns Delegator info. {@link GetDelegatorReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monadTestnet } from 'viem/chains'
   * import { getDelegator } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monadTestnet,
   *   transport: http(),
   * })
   *
   * const delegator = await getDelegator(client, {
   *   args: [1n, '0x...'],
   * })
   * ```
   */
  getDelegator: (
    parameters: GetDelegatorParameters,
  ) => Promise<GetDelegatorReturnType>;
  /**
   * Returns the pending withdrawal request for a (validatorId, delegator, withdrawId) tuple.
   *
   * - Returns the withdrawal amount, accumulator value at time of undelegation, and the epoch when the withdrawal becomes claimable.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getwithdrawalrequest
   *
   * @param parameters - {@link GetWithdrawalRequestParameters}
   * @returns Withdrawal request info. {@link GetWithdrawalRequestReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monadTestnet } from 'viem/chains'
   * import { getWithdrawalRequest } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monadTestnet,
   *   transport: http(),
   * })
   *
   * const withdrawal = await getWithdrawalRequest(client, {
   *   args: [1n, '0x...', 0],
   * })
   * ```
   */
  getWithdrawalRequest: (
    parameters: GetWithdrawalRequestParameters,
  ) => Promise<GetWithdrawalRequestReturnType>;
  /**
   * Returns the consensus validator set IDs, paginated.
   *
   * - Each call retrieves up to `PAGINATED_RESULTS_SIZE` validator IDs starting from `startIndex`.
   * - Returns `(isDone, nextIndex, valIds)`. When `isDone` is false, call again with `nextIndex` as `startIndex`.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
   *
   * @param parameters - {@link GetConsensusValidatorSetParameters}
   * @returns Paginated consensus validator IDs. {@link GetConsensusValidatorSetReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monadTestnet } from 'viem/chains'
   * import { getConsensusValidatorSet } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monadTestnet,
   *   transport: http(),
   * })
   *
   * const result = await getConsensusValidatorSet(client, {
   *   args: [0],
   * })
   * ```
   */
  getConsensusValidatorSet: (
    parameters: GetConsensusValidatorSetParameters,
  ) => Promise<GetConsensusValidatorSetReturnType>;
  /**
   * Returns the snapshot validator set IDs, paginated.
   *
   * - Each call retrieves up to `PAGINATED_RESULTS_SIZE` validator IDs starting from `startIndex`.
   * - Returns `(isDone, nextIndex, valIds)`. When `isDone` is false, call again with `nextIndex` as `startIndex`.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
   *
   * @param parameters - {@link GetSnapshotValidatorSetParameters}
   * @returns Paginated snapshot validator IDs. {@link GetSnapshotValidatorSetReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monadTestnet } from 'viem/chains'
   * import { getSnapshotValidatorSet } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monadTestnet,
   *   transport: http(),
   * })
   *
   * const result = await getSnapshotValidatorSet(client, {
   *   args: [0],
   * })
   * ```
   */
  getSnapshotValidatorSet: (
    parameters: GetSnapshotValidatorSetParameters,
  ) => Promise<GetSnapshotValidatorSetReturnType>;
  /**
   * Returns the execution validator set IDs, paginated.
   *
   * - Each call retrieves up to `PAGINATED_RESULTS_SIZE` validator IDs starting from `startIndex`.
   * - Returns `(isDone, nextIndex, valIds)`. When `isDone` is false, call again with `nextIndex` as `startIndex`.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
   *
   * @param parameters - {@link GetExecutionValidatorSetParameters}
   * @returns Paginated execution validator IDs. {@link GetExecutionValidatorSetReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monadTestnet } from 'viem/chains'
   * import { getExecutionValidatorSet } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monadTestnet,
   *   transport: http(),
   * })
   *
   * const result = await getExecutionValidatorSet(client, {
   *   args: [0],
   * })
   * ```
   */
  getExecutionValidatorSet: (
    parameters: GetExecutionValidatorSetParameters,
  ) => Promise<GetExecutionValidatorSetReturnType>;
  /**
   * Returns the validator IDs to which an address has delegated, paginated.
   *
   * - Each call retrieves up to `PAGINATED_RESULTS_SIZE` validator IDs starting from `startValId`.
   * - Returns `(isDone, nextValId, valIds)`. When `isDone` is false, call again with `nextValId` as `startValId`.
   * - To capture the full set, make the first call with `startValId = 0`.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegations
   *
   * @param parameters - {@link GetDelegationsParameters}
   * @returns Paginated validator IDs the address has delegated to. {@link GetDelegationsReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monadTestnet } from 'viem/chains'
   * import { getDelegations } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monadTestnet,
   *   transport: http(),
   * })
   *
   * const result = await getDelegations(client, {
   *   args: ['0x...', 0n],
   * })
   * ```
   */
  getDelegations: (
    parameters: GetDelegationsParameters,
  ) => Promise<GetDelegationsReturnType>;
  /**
   * Returns the delegator addresses for a given validator, paginated.
   *
   * - Each call retrieves up to `PAGINATED_RESULTS_SIZE` delegator addresses starting from `startDelegator`.
   * - Returns `(isDone, nextDelegator, delegators)`. When `isDone` is false, call again with `nextDelegator` as `startDelegator`.
   * - To capture the full set, make the first call with `startDelegator = 0`.
   * - The number of delegators can be very large; consider maintaining an updated list via events rather than periodically calling this.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegators
   *
   * @param parameters - {@link GetDelegatorsParameters}
   * @returns Paginated delegator addresses. {@link GetDelegatorsReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monadTestnet } from 'viem/chains'
   * import { getDelegators } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monadTestnet,
   *   transport: http(),
   * })
   *
   * const result = await getDelegators(client, {
   *   args: [1n, '0x0000000000000000000000000000000000000000'],
   * })
   * ```
   */
  getDelegators: (
    parameters: GetDelegatorsParameters,
  ) => Promise<GetDelegatorsReturnType>;
  /**
   * Returns the current epoch and whether the network is in the epoch delay period.
   *
   * - If `inEpochDelayPeriod` is false, the boundary block has not been reached and write operations should be effective for `epoch + 1`.
   * - If `inEpochDelayPeriod` is true, the network is past the boundary block and write operations should be effective for `epoch + 2`.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getepoch
   *
   * @param parameters - {@link GetEpochParameters}
   * @returns Current epoch and delay period flag. {@link GetEpochReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monadTestnet } from 'viem/chains'
   * import { getEpoch } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monadTestnet,
   *   transport: http(),
   * })
   *
   * const [epoch, inEpochDelayPeriod] = await getEpoch(client)
   * ```
   */
  getEpoch: (parameters?: GetEpochParameters) => Promise<GetEpochReturnType>;
  /**
   * Returns the validator ID of the current block proposer.
   *
   * - The validator ID corresponds to the SECP value of the block author.
   *
   * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getproposervalid
   *
   * @param parameters - {@link GetProposerValIdParameters}
   * @returns Proposer validator ID. {@link GetProposerValIdReturnType}
   *
   * @example
   * ```ts
   * import { createClient, http } from 'viem'
   * import { monadTestnet } from 'viem/chains'
   * import { getProposerValId } from 'monad-ts-docs'
   *
   * const client = createClient({
   *   chain: monadTestnet,
   *   transport: http(),
   * })
   *
   * const proposerValId = await getProposerValId(client)
   * ```
   */
  getProposerValId: (
    parameters?: GetProposerValIdParameters,
  ) => Promise<GetProposerValIdReturnType>;
};

export function monadActions() {
  return <chain extends Chain | undefined>(
    client: Client<Transport, chain>,
  ): MonadActions => {
    return {
      getValidator: (parameters) => getValidator(client, parameters),
      getDelegator: (parameters) => getDelegator(client, parameters),
      getWithdrawalRequest: (parameters) =>
        getWithdrawalRequest(client, parameters),
      getConsensusValidatorSet: (parameters) =>
        getConsensusValidatorSet(client, parameters),
      getSnapshotValidatorSet: (parameters) =>
        getSnapshotValidatorSet(client, parameters),
      getExecutionValidatorSet: (parameters) =>
        getExecutionValidatorSet(client, parameters),
      getDelegations: (parameters) => getDelegations(client, parameters),
      getDelegators: (parameters) => getDelegators(client, parameters),
      getEpoch: (parameters) => getEpoch(client, parameters),
      getProposerValId: (parameters) => getProposerValId(client, parameters),
    };
  };
}
