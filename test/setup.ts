import { afterAll, beforeAll } from "bun:test";
import { Instance, Server } from "prool";

const server = Server.create({
  instance: Instance.anvil({ forkUrl: "https://rpc.monad.xyz" }),
  port: 8545,
});

export const RPC_URL = `http://localhost:8545/1/`;

beforeAll(async () => {
  await server.start();
});

// TODO(kyle) reset "beforeEach"

afterAll(async () => {
  await server.stop();
});
