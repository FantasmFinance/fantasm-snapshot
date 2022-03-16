require("dotenv/config");

const { JsonRpcProvider } = require("@ethersproject/providers");
const { Contract } = require("ethers");
const fs = require("fs/promises");

const RPC = process.env.RPC;

const SNAPSHOT_BLOCK = {
  blockTag: 32970600,
};
const BLOCK_PER_PAGE = 2000;

const FSM_DEPLOY_BLOCK = 31931806;
const XFTM_DEPLOY_BLOCK = 31931677;

const FSM = "0xaa621D2002b5a6275EF62d7a065A865167914801";
const XFTM = "0xfBD2945D3601f21540DDD85c29C5C3CaF108B96F";

const IGNORE_ADDRESS = [
  "0x0000000000000000000000000000000000000000",
  "0x47091e015b294b935babda2d28ad44e3ab07ae8d", // Fantasm Finance Exploiter
];

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const getERC20Holder = async (provider, symbol, address, abi, deployBlock) => {
  const token = new Contract(address, abi, provider);
  let toBlock = SNAPSHOT_BLOCK.blockTag;

  let holderRawData = new Set();

  while (toBlock > deployBlock) {
    const fromBlock =
      toBlock - BLOCK_PER_PAGE > deployBlock
        ? toBlock - BLOCK_PER_PAGE
        : deployBlock;

    const queryData = await token.queryFilter(
      token.filters.Transfer,
      fromBlock,
      toBlock
    );

    queryData
      .map((item) => item.args?.to)
      .filter((address) => !!address && !IGNORE_ADDRESS.includes(address))
      .forEach((address) => {
        holderRawData.add(address);
      });

    toBlock = fromBlock;
  }

  return Array.from(holderRawData);
};

const snapshotHolders = async (provider) => {
  const fsmHolders = await getERC20Holder(
    provider,
    "FSM",
    FSM,
    ERC20_ABI,
    FSM_DEPLOY_BLOCK
  );
  await fs.writeFile(
    "./output/raw-fsm-holders.json",
    JSON.stringify(fsmHolders, null, 2)
  );

  const xftmHolders = await getERC20Holder(
    provider,
    "XFTM",
    XFTM,
    ERC20_ABI,
    XFTM_DEPLOY_BLOCK
  );
  await fs.writeFile(
    "./output/raw-xftm-holders.json",
    JSON.stringify(xftmHolders, null, 2)
  );
};

const filterNonContractHolders = async (provider) => {
  const fsmHolderFileData = await fs.readFile(
    `./output/raw-fsm-holders.json`,
    "utf8"
  );
  const xftmHolderFileData = await fs.readFile(
    `./output/raw-xftm-holders.json`,
    "utf8"
  );
  const holders = Array.from(
    new Set(
      JSON.parse(fsmHolderFileData).concat(JSON.parse(xftmHolderFileData))
    )
  );
  let result = [];
  for (let i = 0; i < holders.length; i = i + 50) {
    const addresses = holders.slice(i, i + 50);
    await Promise.all(
      addresses.map(async (address) => {
        if ((await provider.getCode(address)) != "0x") {
          return Promise.resolve();
        }
        result.push(address);
      })
    );
  }
  await fs.writeFile(
    `./output/snapshot-holders.json`,
    JSON.stringify(result, null, 2)
  );
};

const main = async () => {
  const provider = new JsonRpcProvider(RPC);
  await snapshotHolders(provider);
  await filterNonContractHolders(provider);
};

main().catch((error) => {
  console.log("error", error);
});
