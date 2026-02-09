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

export type MonadActions = {
  getValidator: (
    parameters: GetValidatorParameters,
  ) => Promise<GetValidatorReturnType>;
  getDelegator: (
    parameters: GetDelegatorParameters,
  ) => Promise<GetDelegatorReturnType>;
  getWithdrawalRequest: (
    parameters: GetWithdrawalRequestParameters,
  ) => Promise<GetWithdrawalRequestReturnType>;
  getConsensusValidatorSet: (
    parameters: GetConsensusValidatorSetParameters,
  ) => Promise<GetConsensusValidatorSetReturnType>;
  getSnapshotValidatorSet: (
    parameters: GetSnapshotValidatorSetParameters,
  ) => Promise<GetSnapshotValidatorSetReturnType>;
  getExecutionValidatorSet: (
    parameters: GetExecutionValidatorSetParameters,
  ) => Promise<GetExecutionValidatorSetReturnType>;
  getDelegations: (
    parameters: GetDelegationsParameters,
  ) => Promise<GetDelegationsReturnType>;
  getDelegators: (
    parameters: GetDelegatorsParameters,
  ) => Promise<GetDelegatorsReturnType>;
  getEpoch: (parameters?: GetEpochParameters) => Promise<GetEpochReturnType>;
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
