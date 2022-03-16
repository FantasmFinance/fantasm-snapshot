require("dotenv/config");

const { JsonRpcProvider } = require("@ethersproject/providers");
const { multicall } = require("./lib/multical");
const fs = require("fs/promises");

const RPC = process.env.RPC;

const SNAPSHOT_BLOCK = {
  blockTag: 32970600,
};

const FSM = "0xaa621D2002b5a6275EF62d7a065A865167914801";
const XFTM = "0xfBD2945D3601f21540DDD85c29C5C3CaF108B96F";
const FSM_FTM_LP = "0x457C8Efcd523058dd58CF080533B41026788eCee";
const XFTM_FTM_LP = "0x128aff18EfF64dA69412ea8d262DC4ef8bb3102d";
const XFTM_FSM_LP = "0xbEa8E843c0fD428f79a166EaE2671E3a8Cc39A0a";

const CHEF = "0x7aeE1FF33E1b7F6D874D488fb2533a79419ca240";
const MULTIFEE_DISTRIBUTION = "0x348634Ea9367690383716FbCa8f225366bbC5966";

const MULTICALL = "0x733D0F0AB6ddb814028B7385e1387f8Da4F6e108";

const getTokenBalance = async (
  provider,
  account,
  xftmFtmLpSupply,
  xftmBalanceInXftmFtmLp,
  fsmFtmLpSupply,
  fsmBalanceInFsmFtmLp,
  xftmFsmLpSupply,
  xftmBalanceInXftmFsmLp,
  fsmBalanceInXftmFsmLp
) => {
  const multicallData = await multicall(
    provider,
    MULTICALL,
    [
      // XFTM
      {
        target: XFTM,
        signature: "balanceOf(address) view returns(uint256)",
        params: [account],
      },
      {
        target: XFTM_FTM_LP,
        signature: "balanceOf(address) view returns(uint256)",
        params: [account],
      },
      {
        target: CHEF,
        signature: "userInfo(uint256, address) view returns(uint256, int256)",
        params: [1, account],
      },
      // FSM
      {
        target: FSM,
        signature: "balanceOf(address) view returns(uint256)",
        params: [account],
      },
      {
        target: FSM_FTM_LP,
        signature: "balanceOf(address) view returns(uint256)",
        params: [account],
      },
      {
        target: CHEF,
        signature: "userInfo(uint256, address) view returns(uint256, int256)",
        params: [0, account],
      },
      // XFTM and FSM
      {
        target: XFTM_FSM_LP,
        signature: "balanceOf(address) view returns(uint256)",
        params: [account],
      },
      {
        target: CHEF,
        signature: "userInfo(uint256, address) view returns(uint256, int256)",
        params: [2, account],
      },
      // FSM in MULTIFEE_DISTRIBUTION
      {
        target: MULTIFEE_DISTRIBUTION,
        signature:
          "withdrawableBalance(address) view returns(uint256, uint256)",
        params: [account],
      },
      {
        target: MULTIFEE_DISTRIBUTION,
        signature:
          "lockedBalances(address) view returns(uint256 total, uint256 unlockable, uint256 uint256)",
        params: [account],
      },
    ],
    SNAPSHOT_BLOCK
  );

  const [
    [xftmBalance],
    [xftmFtmLpBalance],
    [xftmFtmDeposited],
    [fsmBalance],
    [fsmFtmLpBalance],
    [fsmFtmDeposited],
    [xftmFsmLpBalance],
    [xftmFsmDeposited],
    [withdrawableBalance, penaltyAmount],
    [lockedBalance],
  ] = multicallData;

  // Calc XFTM in XFTM/FTM LP

  const xftmUserBalanceInXftmFtmWalletLp = xftmFtmLpBalance
    .mul(xftmBalanceInXftmFtmLp)
    .div(xftmFtmLpSupply);

  const xftmUserBalanceInXftmFtmChefLp = xftmFtmDeposited
    .mul(xftmBalanceInXftmFtmLp)
    .div(xftmFtmLpSupply);

  // Calc FSM in FSM/FTM LP

  const fsmUserBalanceInFsmFtmWalletLp = fsmFtmLpBalance
    .mul(fsmBalanceInFsmFtmLp)
    .div(fsmFtmLpSupply);

  const fsmUserBalanceInFsmFtmChefLp = fsmFtmDeposited
    .mul(fsmBalanceInFsmFtmLp)
    .div(fsmFtmLpSupply);

  // Calc XFTM and FSM in XFTM/FSM LP

  const xftmUserBalanceInXftmFsmWalletLp = xftmFsmLpBalance
    .mul(xftmBalanceInXftmFsmLp)
    .div(xftmFsmLpSupply);

  const xftmUserBalanceInXftmFsmChefLp = xftmFsmDeposited
    .mul(xftmBalanceInXftmFsmLp)
    .div(xftmFsmLpSupply);

  const fsmUserBalanceInXftmFsmWalletLp = xftmFsmLpBalance
    .mul(fsmBalanceInXftmFsmLp)
    .div(xftmFsmLpSupply);

  const fsmUserBalanceInXftmFsmChefLp = xftmFsmDeposited
    .mul(fsmBalanceInXftmFsmLp)
    .div(xftmFsmLpSupply);

  const staking = withdrawableBalance.sub(penaltyAmount);

  const totalXftmBalance = xftmBalance
    .add(xftmUserBalanceInXftmFtmWalletLp)
    .add(xftmUserBalanceInXftmFtmChefLp)
    .add(xftmUserBalanceInXftmFsmWalletLp)
    .add(xftmUserBalanceInXftmFsmChefLp);

  const totalFsmBalance = fsmBalance
    .add(fsmUserBalanceInFsmFtmWalletLp)
    .add(fsmUserBalanceInFsmFtmChefLp)
    .add(fsmUserBalanceInXftmFsmWalletLp)
    .add(fsmUserBalanceInXftmFsmChefLp)
    .add(withdrawableBalance)
    .add(lockedBalance);

  return {
    fsm: {
      total: totalFsmBalance.toString(),
      wallet: fsmBalance.toString(),
      inFsmFtmWalletLp: fsmUserBalanceInFsmFtmWalletLp.toString(),
      inFsmFtmFarmLp: fsmUserBalanceInFsmFtmChefLp.toString(),
      inFsmXftmWalletLp: fsmUserBalanceInXftmFsmWalletLp.toString(),
      inFsmXftmFarmLp: fsmUserBalanceInXftmFsmChefLp.toString(),
      vesting: penaltyAmount.toString(),
      lock: lockedBalance.toString(),
      staking: staking.toString(),
    },
    xftm: {
      total: totalXftmBalance.toString(),
      wallet: xftmBalance.toString(),
      inXftmFtmWalletLp: xftmUserBalanceInXftmFtmWalletLp.toString(),
      inXftmFtmFarmLp: xftmUserBalanceInXftmFtmChefLp.toString(),
      inFsmXftmWalletLp: xftmUserBalanceInXftmFsmWalletLp.toString(),
      inFsmXftmFarmLp: xftmUserBalanceInXftmFsmChefLp.toString(),
    },
  };
};

const snapshotTokenBalance = async (provider) => {
  const fileData = await fs.readFile('./output/snapshot-holders.json', "utf8");
  const holders = JSON.parse(fileData);
  const multicallData = await multicall(
    provider,
    MULTICALL,
    [
      {
        target: XFTM_FTM_LP,
        signature: "totalSupply() view returns(uint256)",
        params: [],
      },
      {
        target: XFTM,
        signature: "balanceOf(address) view returns(uint256)",
        params: [XFTM_FTM_LP],
      },
      {
        target: FSM_FTM_LP,
        signature: "totalSupply() view returns(uint256)",
        params: [],
      },
      {
        target: FSM,
        signature: "balanceOf(address) view returns(uint256)",
        params: [FSM_FTM_LP],
      },
      {
        target: XFTM_FSM_LP,
        signature: "totalSupply() view returns(uint256)",
        params: [],
      },
      {
        target: XFTM,
        signature: "balanceOf(address) view returns(uint256)",
        params: [XFTM_FSM_LP],
      },
      {
        target: FSM,
        signature: "balanceOf(address) view returns(uint256)",
        params: [XFTM_FSM_LP],
      },
    ],
    SNAPSHOT_BLOCK
  );

  const [
    [xftmFtmLpSupply],
    [xftmBalanceInXftmFtmLp],
    [fsmFtmLpSupply],
    [fsmBalanceInFsmFtmLp],
    [xftmFsmLpSupply],
    [xftmBalanceInXftmFsmLp],
    [fsmBalanceInXftmFsmLp],
  ] = multicallData;

  let result = {};

  for (let i = 0; i < holders.length; i++) {
    const account = holders[i];
    const data = await getTokenBalance(
      provider,
      account,
      xftmFtmLpSupply,
      xftmBalanceInXftmFtmLp,
      fsmFtmLpSupply,
      fsmBalanceInFsmFtmLp,
      xftmFsmLpSupply,
      xftmBalanceInXftmFsmLp,
      fsmBalanceInXftmFsmLp
    );
    result[account] = data;
  }

  await fs.writeFile(`./output/snapshot-balance.json`, JSON.stringify(result));
};

const main = async () => {
  const provider = new JsonRpcProvider(RPC);
  await snapshotTokenBalance(provider);
};

main().catch((error) => {
  console.log("error", error);
});
