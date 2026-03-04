import type { Chain, Client, Transport } from "viem";
import {
  type GetConsensusValidatorSetParameters,
  type GetConsensusValidatorSetReturnType,
  getConsensusValidatorSet,
} from "./actions/staking/getConsensusValidatorSet.js";
import {
  type GetDelegationsParameters,
  type GetDelegationsReturnType,
  getDelegations,
} from "./actions/staking/getDelegations.js";
import {
  type GetDelegatorParameters,
  type GetDelegatorReturnType,
  getDelegator,
} from "./actions/staking/getDelegator.js";
import {
  type GetDelegatorsParameters,
  type GetDelegatorsReturnType,
  getDelegators,
} from "./actions/staking/getDelegators.js";
import {
  type GetEpochParameters,
  type GetEpochReturnType,
  getEpoch,
} from "./actions/staking/getEpoch.js";
import {
  type GetExecutionValidatorSetParameters,
  type GetExecutionValidatorSetReturnType,
  getExecutionValidatorSet,
} from "./actions/staking/getExecutionValidatorSet.js";
import {
  type GetProposerValIdParameters,
  type GetProposerValIdReturnType,
  getProposerValId,
} from "./actions/staking/getProposerValId.js";
import {
  type GetSnapshotValidatorSetParameters,
  type GetSnapshotValidatorSetReturnType,
  getSnapshotValidatorSet,
} from "./actions/staking/getSnapshotValidatorSet.js";
import {
  type GetValidatorParameters,
  type GetValidatorReturnType,
  getValidator,
} from "./actions/staking/getValidator.js";
import {
  type GetWithdrawalRequestParameters,
  type GetWithdrawalRequestReturnType,
  getWithdrawalRequest,
} from "./actions/staking/getWithdrawalRequest.js";
import {
  type GetAllowanceParameters,
  type GetAllowanceReturnType,
  getAllowance,
} from "./actions/wmon/getAllowance.js";
import {
  type GetBalanceOfParameters,
  type GetBalanceOfReturnType,
  getBalanceOf,
} from "./actions/wmon/getBalanceOf.js";

export type MonadActions = {
  staking: {
    /**
     * Returns a validator's complete state across execution, consensus, and snapshot contexts.
     *
     * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getvalidator
     *
     * @param parameters - {@link GetValidatorParameters}
     * @returns Validator state including auth address, flags, stake, accumulator, commission, unclaimed rewards, consensus/snapshot stake and commission, and public keys. {@link GetValidatorReturnType}
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { monad } from 'viem/chains'
     * import { monadActions } from '@monad-crypto/viem'
     *
     * const client = createClient({
     *   chain: monad,
     *   transport: http(),
     * }).extend(monadActions())
     *
     * const validator = await client.staking.getValidator({
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
     * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegator
     *
     * @param parameters - {@link GetDelegatorParameters}
     * @returns Delegator's active stake, accumulator, unclaimed rewards, and pending delta stakes and epochs. {@link GetDelegatorReturnType}
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { monad } from 'viem/chains'
     * import { monadActions } from '@monad-crypto/viem'
     *
     * const client = createClient({
     *   chain: monad,
     *   transport: http(),
     * }).extend(monadActions())
     *
     * const delegator = await client.staking.getDelegator({
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
     * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getwithdrawalrequest
     *
     * @param parameters - {@link GetWithdrawalRequestParameters}
     * @returns Withdrawal amount, accumulator value at time of undelegation, and the epoch when the withdrawal becomes claimable. {@link GetWithdrawalRequestReturnType}
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { monad } from 'viem/chains'
     * import { monadActions } from '@monad-crypto/viem'
     *
     * const client = createClient({
     *   chain: monad,
     *   transport: http(),
     * }).extend(monadActions())
     *
     * const withdrawal = await client.staking.getWithdrawalRequest({
     *   args: [1n, '0x...', 0],
     * })
     * ```
     */
    getWithdrawalRequest: (
      parameters: GetWithdrawalRequestParameters,
    ) => Promise<GetWithdrawalRequestReturnType>;
    /**
     * Returns the consensus validator set IDs. Results are paginated; when `isDone` is false, call again with `nextIndex` as `startIndex`.
     *
     * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
     *
     * @param parameters - {@link GetConsensusValidatorSetParameters}
     * @returns `(isDone, nextIndex, valIds)` tuple of consensus validator IDs. {@link GetConsensusValidatorSetReturnType}
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { monad } from 'viem/chains'
     * import { monadActions } from '@monad-crypto/viem'
     *
     * const client = createClient({
     *   chain: monad,
     *   transport: http(),
     * }).extend(monadActions())
     *
     * const result = await client.staking.getConsensusValidatorSet({
     *   args: [0],
     * })
     * ```
     */
    getConsensusValidatorSet: (
      parameters: GetConsensusValidatorSetParameters,
    ) => Promise<GetConsensusValidatorSetReturnType>;
    /**
     * Returns the snapshot validator set IDs. Results are paginated; when `isDone` is false, call again with `nextIndex` as `startIndex`.
     *
     * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
     *
     * @param parameters - {@link GetSnapshotValidatorSetParameters}
     * @returns `(isDone, nextIndex, valIds)` tuple of snapshot validator IDs. {@link GetSnapshotValidatorSetReturnType}
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { monad } from 'viem/chains'
     * import { monadActions } from '@monad-crypto/viem'
     *
     * const client = createClient({
     *   chain: monad,
     *   transport: http(),
     * }).extend(monadActions())
     *
     * const result = await client.staking.getSnapshotValidatorSet({
     *   args: [0],
     * })
     * ```
     */
    getSnapshotValidatorSet: (
      parameters: GetSnapshotValidatorSetParameters,
    ) => Promise<GetSnapshotValidatorSetReturnType>;
    /**
     * Returns the execution validator set IDs. Results are paginated; when `isDone` is false, call again with `nextIndex` as `startIndex`.
     *
     * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
     *
     * @param parameters - {@link GetExecutionValidatorSetParameters}
     * @returns `(isDone, nextIndex, valIds)` tuple of execution validator IDs. {@link GetExecutionValidatorSetReturnType}
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { monad } from 'viem/chains'
     * import { monadActions } from '@monad-crypto/viem'
     *
     * const client = createClient({
     *   chain: monad,
     *   transport: http(),
     * }).extend(monadActions())
     *
     * const result = await client.staking.getExecutionValidatorSet({
     *   args: [0],
     * })
     * ```
     */
    getExecutionValidatorSet: (
      parameters: GetExecutionValidatorSetParameters,
    ) => Promise<GetExecutionValidatorSetReturnType>;
    /**
     * Returns the validator IDs to which an address has delegated. Results are paginated; when `isDone` is false, call again with `nextValId` as `startValId`.
     *
     * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegations
     *
     * @param parameters - {@link GetDelegationsParameters}
     * @returns `(isDone, nextValId, valIds)` tuple of validator IDs the address has delegated to. {@link GetDelegationsReturnType}
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { monad } from 'viem/chains'
     * import { monadActions } from '@monad-crypto/viem'
     *
     * const client = createClient({
     *   chain: monad,
     *   transport: http(),
     * }).extend(monadActions())
     *
     * const result = await client.staking.getDelegations({
     *   args: ['0x...', 0n],
     * })
     * ```
     */
    getDelegations: (
      parameters: GetDelegationsParameters,
    ) => Promise<GetDelegationsReturnType>;
    /**
     * Returns the delegator addresses for a given validator. Results are paginated; when `isDone` is false, call again with `nextDelegator` as `startDelegator`.
     *
     * @dev The number of delegators can be very large; consider maintaining an updated list via events rather than periodically calling this.
     *
     * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegators
     *
     * @param parameters - {@link GetDelegatorsParameters}
     * @returns `(isDone, nextDelegator, delegators)` tuple of delegator addresses. {@link GetDelegatorsReturnType}
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { monad } from 'viem/chains'
     * import { monadActions } from '@monad-crypto/viem'
     *
     * const client = createClient({
     *   chain: monad,
     *   transport: http(),
     * }).extend(monadActions())
     *
     * const result = await client.staking.getDelegators({
     *   args: [1n, '0x0000000000000000000000000000000000000000'],
     * })
     * ```
     */
    getDelegators: (
      parameters: GetDelegatorsParameters,
    ) => Promise<GetDelegatorsReturnType>;
    /**
     * Returns the current epoch and whether the network is in the epoch delay period. If `inEpochDelayPeriod` is false, write operations are effective for `epoch + 1`; if true, for `epoch + 2`.
     *
     * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getepoch
     *
     * @returns `(epoch, inEpochDelayPeriod)` tuple. {@link GetEpochReturnType}
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { monad } from 'viem/chains'
     * import { monadActions } from '@monad-crypto/viem'
     *
     * const client = createClient({
     *   chain: monad,
     *   transport: http(),
     * }).extend(monadActions())
     *
     * const [epoch, inEpochDelayPeriod] = await client.staking.getEpoch()
     * ```
     */
    getEpoch: (parameters?: GetEpochParameters) => Promise<GetEpochReturnType>;
    /**
     * Returns the validator ID of the current block proposer, corresponding to the SECP value of the block author.
     *
     * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getproposervalid
     *
     * @returns Validator ID of the current block proposer. {@link GetProposerValIdReturnType}
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { monad } from 'viem/chains'
     * import { monadActions } from '@monad-crypto/viem'
     *
     * const client = createClient({
     *   chain: monad,
     *   transport: http(),
     * }).extend(monadActions())
     *
     * const proposerValId = await client.staking.getProposerValId()
     * ```
     */
    getProposerValId: (
      parameters?: GetProposerValIdParameters,
    ) => Promise<GetProposerValIdReturnType>;
  };
  wmon: {
    /**
     * Returns the WMON balance of the given address.
     *
     * @param parameters - {@link GetBalanceOfParameters}
     * @returns The WMON balance. {@link GetBalanceOfReturnType}
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { monad } from 'viem/chains'
     * import { monadActions } from '@monad-crypto/viem'
     *
     * const client = createClient({
     *   chain: monad,
     *   transport: http(),
     * }).extend(monadActions())
     *
     * const balance = await client.wmon.getBalanceOf({
     *   args: ['0x...'],
     * })
     * ```
     */
    getBalanceOf: (
      parameters: GetBalanceOfParameters,
    ) => Promise<GetBalanceOfReturnType>;
    /**
     * Returns the amount of WMON the spender is allowed to spend on behalf of the owner.
     *
     * @param parameters - {@link GetAllowanceParameters}
     * @returns The allowance amount. {@link GetAllowanceReturnType}
     *
     * @example
     * ```ts
     * import { createClient, http } from 'viem'
     * import { monad } from 'viem/chains'
     * import { monadActions } from '@monad-crypto/viem'
     *
     * const client = createClient({
     *   chain: monad,
     *   transport: http(),
     * }).extend(monadActions())
     *
     * const allowance = await client.wmon.getAllowance({
     *   args: ['0x...', '0x...'],
     * })
     * ```
     */
    getAllowance: (
      parameters: GetAllowanceParameters,
    ) => Promise<GetAllowanceReturnType>;
  };
};

/**
 * Actions for interacting with the Monad staking precompile and WMON token.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { monadActions } from '@monad-crypto/viem'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * }).extend(monadActions())
 *
 * const validator = await client.staking.getValidator({ args: [1n] })
 * ```
 */
export function monadActions() {
  return <chain extends Chain | undefined>(
    client: Client<Transport, chain>,
  ): MonadActions => {
    return {
      staking: {
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
      },
      wmon: {
        getBalanceOf: (parameters) => getBalanceOf(client, parameters),
        getAllowance: (parameters) => getAllowance(client, parameters),
      },
    };
  };
}
