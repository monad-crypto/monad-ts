import type {
  Account,
  Chain,
  Client,
  Hash,
  WriteContractParameters,
  WriteContractSyncParameters,
  WriteContractErrorType,
  WriteContractSyncErrorType,
  WriteContractSyncReturnType,
  Transport,
} from "viem";
import { writeContract, writeContractSync } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from "./abi";

export type AddValidatorParameters<
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
> = Omit<
  WriteContractParameters<
    typeof stakingAbi,
    "addValidator",
    never,
    chain,
    account
  >,
  "abi" | "address" | "functionName"
>;
export type AddValidatorSyncParameters<
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
> = Omit<
  WriteContractSyncParameters<
    typeof stakingAbi,
    "addValidator",
    never,
    chain,
    account
  >,
  "abi" | "address" | "functionName"
>;
export type AddValidatorReturnType = Hash;
export type AddValidatorSyncReturnType<
  chain extends Chain | undefined = Chain | undefined,
> = WriteContractSyncReturnType<chain>;
export type AddValidatorErrorType = WriteContractErrorType;
export type AddValidatorSyncErrorType = WriteContractSyncErrorType;

/**
 * Creates a validator with an associated delegator account.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#addvalidator
 *
 * @example
 * ```ts
 * import { createWalletClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { addValidator } from 'monad-ext'
 *
 * const client = createWalletClient({
 *   chain: monad,
 *   transport: custom(window.ethereum),
 * })
 *
 * const hash = await addValidator(client, {
 *   payload: '0x...',
 *   signedSecpMessage: '0x...',
 *   signedBlsMessage: '0x...',
 *   value: 100000000000000000000n,
 * })
 * ```
 */
export async function addValidator<
  chain extends Chain | undefined,
  account extends Account | undefined,
>(
  client: Client<Transport, chain, account>,
  parameters: AddValidatorParameters<chain, account>,
): Promise<AddValidatorReturnType> {
  return writeContract(client, {
    ...parameters,
    chain: parameters.chain ?? client.chain,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "addValidator",
  } as any);
}

/**
 * Adds a new validator to the staking system and waits for the transaction
 * to be included on a block.
 *
 * @example
 * ```ts
 * import { createWalletClient, createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { addValidatorSync } from 'monad-ext'
 *
 * const walletClient = createWalletClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const receipt = await addValidatorSync(walletClient, {
 *   payload: '0x...',
 *   signedSecpMessage: '0x...',
 *   signedBlsMessage: '0x...',
 *   value: 100000000000000000000n,
 * })
 * ```
 */
export async function addValidatorSync<
  chain extends Chain | undefined,
  account extends Account | undefined,
>(
  client: Client<Transport, chain, account>,
  parameters: AddValidatorParameters<chain, account>,
): Promise<AddValidatorSyncReturnType> {
  return writeContractSync(client, {
    ...parameters,
    chain: parameters.chain ?? client.chain,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "addValidator",
  } as any);
}
