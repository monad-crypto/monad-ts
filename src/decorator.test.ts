import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup.js";
import { monadActions } from "./decorator.js";

test("client extend", async () => {
  // @ts-ignore
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());
});

test("staking.getValidator", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());

  const validator = await client.staking.getValidator({
    args: [46n],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(validator).toMatchInlineSnapshot(`
    [
      "0x685E077fC097079F964Ea8B6258bfbFb976e248f",
      0n,
      81533537319859456013443188n,
      29443702829281795545833527234707196n,
      50000000000000000n,
      59842486971212835358079n,
      81533537319859456013443188n,
      50000000000000000n,
      81533525982249519058895028n,
      50000000000000000n,
      "0x027c4cf38a0e694180155195b763e5e2d8fd737533940414b97b14426f347c707b",
      "0xa555f52bbfca8ec870bc65fb046a10475e76a2335eaa362cff0ab4c970f901df6353a97c393747945e206c6728b6bfff",
    ]
  `);
});

test("staking.getDelegator", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());

  const delegator = await client.staking.getDelegator({
    args: [21n, "0x57A7c50E6C27B6252ff484785A6d75E294c8A0a5"],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(delegator).toMatchInlineSnapshot(`
    [
      343648730916945617574983n,
      27176212028178372832642064668773073n,
      71820874209844354289n,
      1123465991474012666727n,
      0n,
      1041n,
      0n,
    ]
  `);
});

test("staking.getWithdrawalRequest", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());

  const withdrawal = await client.staking.getWithdrawalRequest({
    args: [46n, "0x0000000000000000000000000000000000000000", 0],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(withdrawal).toMatchInlineSnapshot(`
    [
      0n,
      0n,
      0n,
    ]
  `);
});

test("staking.getConsensusValidatorSet", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());

  const validatorSet = await client.staking.getConsensusValidatorSet({
    args: [0],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(validatorSet).toMatchInlineSnapshot(`
    [
      false,
      100,
      [
        97n,
        3n,
        92n,
        23n,
        123n,
        6n,
        9n,
        172n,
        5n,
        16n,
        12n,
        102n,
        4n,
        11n,
        10n,
        55n,
        39n,
        7n,
        78n,
        72n,
        36n,
        114n,
        128n,
        43n,
        17n,
        56n,
        170n,
        129n,
        158n,
        46n,
        75n,
        154n,
        76n,
        159n,
        133n,
        168n,
        125n,
        25n,
        152n,
        26n,
        179n,
        169n,
        157n,
        20n,
        94n,
        141n,
        98n,
        138n,
        136n,
        106n,
        127n,
        100n,
        73n,
        146n,
        31n,
        144n,
        38n,
        54n,
        99n,
        52n,
        116n,
        143n,
        51n,
        45n,
        110n,
        112n,
        162n,
        71n,
        88n,
        8n,
        48n,
        148n,
        151n,
        61n,
        139n,
        160n,
        105n,
        30n,
        109n,
        28n,
        29n,
        166n,
        82n,
        37n,
        58n,
        35n,
        153n,
        66n,
        53n,
        67n,
        117n,
        115n,
        69n,
        111n,
        83n,
        21n,
        63n,
        68n,
        50n,
        87n,
      ],
    ]
  `);
});

test("staking.getSnapshotValidatorSet", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());

  const validatorSet = await client.staking.getSnapshotValidatorSet({
    args: [0],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(validatorSet).toMatchInlineSnapshot(`
    [
      false,
      100,
      [
        97n,
        3n,
        92n,
        23n,
        123n,
        6n,
        9n,
        172n,
        5n,
        16n,
        12n,
        102n,
        4n,
        11n,
        10n,
        55n,
        39n,
        7n,
        78n,
        72n,
        36n,
        114n,
        128n,
        43n,
        17n,
        56n,
        170n,
        129n,
        158n,
        46n,
        75n,
        154n,
        76n,
        159n,
        133n,
        168n,
        125n,
        169n,
        25n,
        152n,
        26n,
        179n,
        157n,
        20n,
        94n,
        141n,
        98n,
        138n,
        136n,
        106n,
        127n,
        100n,
        73n,
        146n,
        31n,
        144n,
        38n,
        54n,
        99n,
        52n,
        116n,
        143n,
        51n,
        45n,
        110n,
        112n,
        162n,
        71n,
        88n,
        8n,
        48n,
        148n,
        151n,
        61n,
        139n,
        160n,
        105n,
        30n,
        109n,
        28n,
        29n,
        166n,
        82n,
        37n,
        58n,
        35n,
        153n,
        66n,
        53n,
        67n,
        117n,
        115n,
        69n,
        111n,
        83n,
        63n,
        21n,
        68n,
        50n,
        87n,
      ],
    ]
  `);
});

test("staking.getExecutionValidatorSet", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());

  const validatorSet = await client.staking.getExecutionValidatorSet({
    args: [0],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(validatorSet).toMatchInlineSnapshot(`
    [
      false,
      100,
      [
        161n,
        159n,
        3n,
        4n,
        5n,
        6n,
        7n,
        8n,
        9n,
        10n,
        27n,
        26n,
        24n,
        23n,
        22n,
        21n,
        20n,
        19n,
        18n,
        17n,
        15n,
        14n,
        13n,
        12n,
        11n,
        42n,
        16n,
        41n,
        39n,
        40n,
        38n,
        32n,
        36n,
        35n,
        33n,
        30n,
        34n,
        31n,
        28n,
        29n,
        25n,
        43n,
        44n,
        45n,
        46n,
        37n,
        48n,
        49n,
        50n,
        51n,
        52n,
        54n,
        55n,
        56n,
        58n,
        177n,
        60n,
        61n,
        182n,
        65n,
        66n,
        79n,
        81n,
        80n,
        83n,
        73n,
        77n,
        75n,
        76n,
        78n,
        70n,
        71n,
        179n,
        67n,
        53n,
        69n,
        68n,
        74n,
        72n,
        64n,
        57n,
        96n,
        95n,
        90n,
        97n,
        91n,
        93n,
        98n,
        92n,
        85n,
        89n,
        87n,
        82n,
        84n,
        86n,
        183n,
        63n,
        103n,
        99n,
        104n,
      ],
    ]
  `);
});

test("staking.getDelegations", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());

  const delegations = await client.staking.getDelegations({
    args: ["0x57A7c50E6C27B6252ff484785A6d75E294c8A0a5", 0n],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(delegations).toMatchInlineSnapshot(`
    [
      true,
      0n,
      [
        21n,
      ],
    ]
  `);
});

test("staking.getDelegators", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());

  const delegators = await client.staking.getDelegators({
    args: [46n, "0x0000000000000000000000000000000000000000"],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(delegators).toMatchInlineSnapshot(`
    [
      false,
      "0x871f16aC15D7F64fFd898a2A7225580dcBD32e52",
      [
        "0xC038f96787ca6e16f42A5FF2e1284223A7b42003",
        "0xa6f17959287a2d415151a71435C0c655C6f28a27",
        "0xa79633c3bF4A7BbE3F46Ddf66585961e3cD64eA9",
        "0xf51DE770bE61317f6190B66399734912d0fD4C11",
        "0x9bAd97046C2D4f6722927856B4683748Dd25E207",
        "0x0e674245f1BbB66E936834a7a768edff01eEBB3B",
        "0xe1ba1bc061985F6A23034282f134a0cc8127F4dA",
        "0x1E7fc6A0671Fe792259D8B5Af364A34DD2B1D418",
        "0x6d8ce60eb0B3c032165FE771C1C6Ba2563C2eA2B",
        "0x8EDA77b0d64054Ea53a76805C08b24F026517E5f",
        "0xDfDA772DDA6e0E67D130ae2852AE9C746567d92E",
        "0x9056efe373AaF75ce6F54dE473346E2d14752880",
        "0x212f9e272D760036565884ad1896Da80eDbC69F3",
        "0x4F2A7538a0f1d294348c8f25E8d223fF13B22918",
        "0xe62636055aFD19FdE4BBFD2B251Bc8B5CFFc3166",
        "0xa88e24aF8007917C25039b6F49165e5FCDCD3d11",
        "0x438364532B3b8F5CAA556e8354472450d6244D1E",
        "0x880B03faBFBf2DC01515b458313212DF50Bb0c1B",
        "0x338ED82BBC1eB8daEfc60C2a6d3cA8b1d9178d84",
        "0xE95322c4387F39aE6c2C7C8cEbAB3AcC2AEF394C",
        "0xeaC588c49aBFA4FA042B5e944Eb061C8174c6880",
        "0x2aD7b58BF520d317E23cB3F8e9BA7865F2bd7e3C",
        "0xDE8B99F7b367F5C6164cAa207298Dd7a170c1d99",
        "0xd3876A06b43307e64d9d5BF142aF94A3153e33bC",
        "0x8eaD3e1019091F8a3B796C64CFFd36B4c85c23Ef",
        "0x5425F85D189175FA0B115C0f9fD396d8bB2BBC00",
        "0x77aF7042a4F9039840eaEF38D6A54A25e0507E20",
        "0x5d247f018AC8795D53b364dc15d8C7D0aa2f8821",
        "0xBAaBe3EE034e09c0CD94DF29b94e091df207E4E0",
        "0x481809e646CfBBe1350b9592B62308879102548d",
        "0xd2237D9fd27798AC58fEec9772A36757e70C454b",
        "0x9A9fb9749A4Ee3a402FfF0bFE0915D2e780f7154",
        "0x00001EeeB6F8Ca55c9d956fBa882CD977a42B933",
        "0x97B2Ee8468Eda39f14443f87FAE166Af35B9030D",
        "0x4DEa26fF6F7276058E6189c73F3d7654740ecCe0",
        "0x7A86F253E7EAe52d0d361731Fe527631886BA650",
        "0x9e64d5a9A7E6D6A02ff0e6CC41c76CEBdB1D96bD",
        "0xE0689810B35c9cACCDda78C1580c262e19c885c5",
        "0x2855293acAf295fEaaD08dFB4F445933311F2af9",
        "0x33F16534f37421c2650A6440f8c056970F8d2687",
        "0x0783f5A4A65247cC1a49E4e7064C2339C7226c4b",
        "0x3C225f270f119a947d5a3434f67f4fE688F4bAB0",
        "0x8b27555Ae821D52f38Db3c7BA0C8cE0354D4EFe6",
        "0x5968417278cb1cfAC99D3d619DEF48Daa7d6c490",
        "0xa9fFa6718B74793d2144f79561D3d9fA24230a39",
        "0x036aFe88DfF42abD121E0180c2816Cbc3c499fc3",
        "0x333036E56e53752265018a1d579AC4CB1d537D11",
        "0x95c5593e13b1b57e472dBdCABF813b73D04cfD13",
        "0x419b9D80f7b3A296f3B9dc62210bFfcff0B93320",
        "0x4a06748E764640b8E7e71EED190bBCE03F9Cb22F",
      ],
    ]
  `);
});

test("staking.getEpoch", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());

  const epoch = await client.staking.getEpoch({
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(epoch).toMatchInlineSnapshot(`
    [
      1040n,
      true,
    ]
  `);
});

test("staking.getProposerValId", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());

  const proposerValId = await client.staking.getProposerValId({
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(proposerValId).toMatchInlineSnapshot(`172n`);
});

test("wmon.getBalanceOf", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());

  const balance = await client.wmon.getBalanceOf({
    args: ["0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A"],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(balance).toMatchInlineSnapshot(`1675972005607237320311n`);
});

test("wmon.getAllowance", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());

  const allowance = await client.wmon.getAllowance({
    args: [
      "0x058EC190471E8A89d40A522C803D456715A93316",
      "0x000000000022D473030F116dDEE9F6B43aC78BA3",
    ],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(allowance).toMatchInlineSnapshot(
    `115792089237316195423570985008687907853269984665640564039457584007913129639935n`,
  );
});
