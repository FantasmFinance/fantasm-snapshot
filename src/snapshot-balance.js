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
const XFTM_FTM_PANIC_SWAP_LP = "0x124b8cC3c88DF53DB0D4474423440D884493fc85";

const CHEF = "0x7aeE1FF33E1b7F6D874D488fb2533a79419ca240";
const PANIC_SWAP_CHEF = "0xc02563f20ba3e91e459299c3ac1f70724272d618";
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
  fsmBalanceInXftmFsmLp,
  xftmFtmPanicLpSupply,
  xftmBalanceInXftmFtmPanicLp
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
      // XFTM in PANIC_SWAP
      {
        target: XFTM_FTM_PANIC_SWAP_LP,
        signature: "balanceOf(address) view returns(uint256)",
        params: [account],
      },
      {
        target: PANIC_SWAP_CHEF,
        signature: "userInfo(uint256, address) view returns(uint256, int256)",
        params: [10, account],
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
    [xftmFtmPanicSwapLpBalance],
    [xftmFtmPanicSwapDeposited],
  ] = multicallData;

  // Calc XFTM in XFTM/FTM LP

  const xftmFromXftmFtmLpInWallet = xftmFtmLpBalance
    .mul(xftmBalanceInXftmFtmLp)
    .div(xftmFtmLpSupply);

  const xftmFromXftmFtmLpInChef = xftmFtmDeposited
    .mul(xftmBalanceInXftmFtmLp)
    .div(xftmFtmLpSupply);

  // Calc XFTM in XFTM/FTM PANIC SWAP LP

  const xftmFromPanicLpInWallet = xftmFtmPanicSwapLpBalance
    .mul(xftmBalanceInXftmFtmPanicLp)
    .div(xftmFtmPanicLpSupply);

  const xftmFromPanicLpInChef = xftmFtmPanicSwapDeposited
    .mul(xftmBalanceInXftmFtmPanicLp)
    .div(xftmFtmPanicLpSupply);

  // Calc FSM in FSM/FTM LP

  const fsmFromFsmFtmLpInWallet = fsmFtmLpBalance
    .mul(fsmBalanceInFsmFtmLp)
    .div(fsmFtmLpSupply);

  const fsmFromFsmFtmLpInChef = fsmFtmDeposited
    .mul(fsmBalanceInFsmFtmLp)
    .div(fsmFtmLpSupply);

  // Calc XFTM and FSM in XFTM/FSM LP

  const xftmFromXftmFsmLpInWallet = xftmFsmLpBalance
    .mul(xftmBalanceInXftmFsmLp)
    .div(xftmFsmLpSupply);

  const xftmFromXftmFsmLpInChef = xftmFsmDeposited
    .mul(xftmBalanceInXftmFsmLp)
    .div(xftmFsmLpSupply);

  const fsmFromXftmFsmLpInWallet = xftmFsmLpBalance
    .mul(fsmBalanceInXftmFsmLp)
    .div(xftmFsmLpSupply);

  const fsmFromXftmFsmLpInChef = xftmFsmDeposited
    .mul(fsmBalanceInXftmFsmLp)
    .div(xftmFsmLpSupply);

  const staking = withdrawableBalance.sub(penaltyAmount);

  const totalXftmBalance = xftmBalance
    .add(xftmFromXftmFtmLpInWallet)
    .add(xftmFromXftmFtmLpInChef)
    .add(xftmFromXftmFsmLpInWallet)
    .add(xftmFromXftmFsmLpInChef)
    .add(xftmFromPanicLpInWallet)
    .add(xftmFromPanicLpInChef)

  const totalFsmBalance = fsmBalance
    .add(fsmFromFsmFtmLpInWallet)
    .add(fsmFromFsmFtmLpInChef)
    .add(fsmFromXftmFsmLpInWallet)
    .add(fsmFromXftmFsmLpInChef)
    .add(withdrawableBalance)
    .add(lockedBalance);

  return {
    fsm: {
      total: totalFsmBalance.toString(),
      wallet: fsmBalance.toString(),
      inFsmFtmWalletLp: fsmFromFsmFtmLpInWallet.toString(),
      inFsmFtmFarmLp: fsmFromFsmFtmLpInChef.toString(),
      inFsmXftmWalletLp: fsmFromXftmFsmLpInWallet.toString(),
      inFsmXftmFarmLp: fsmFromXftmFsmLpInChef.toString(),
      vesting: penaltyAmount.toString(),
      lock: lockedBalance.toString(),
      staking: staking.toString(),
    },
    xftm: {
      total: totalXftmBalance.toString(),
      wallet: xftmBalance.toString(),
      inXftmFtmWalletLp: xftmFromXftmFtmLpInWallet.toString(),
      inXftmFtmFarmLp: xftmFromXftmFtmLpInChef.toString(),
      inFsmXftmWalletLp: xftmFromXftmFsmLpInWallet.toString(),
      inFsmXftmFarmLp: xftmFromXftmFsmLpInChef.toString(),
      inPanicSwapWalletLp: xftmFromPanicLpInWallet.toString(),
      inPanicSwapFarmLp: xftmFromPanicLpInChef.toString(),
    },
  };
};

const snapshotTokenBalance = async (provider) => {
  const fileData = await fs.readFile("./output/snapshot-holders.json", "utf8");
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
      {
        target: XFTM_FTM_PANIC_SWAP_LP,
        signature: "totalSupply() view returns(uint256)",
        params: [],
      },
      {
        target: XFTM,
        signature: "balanceOf(address) view returns(uint256)",
        params: [XFTM_FTM_PANIC_SWAP_LP],
      },
    ],
    SNAPSHOT_BLOCK
  );

  const [
    [xftmFtmSupply],
    [xftmFromXftmFtm],
    [fsmFtmSupply],
    [fsmFromFsmFtm],
    [xftmFsmSupply],
    [xftmFromXftmFsm],
    [fsmFromXftmFsm],
    [xftmFtmPanicSwapSupply],
    [xftmFromXftmFtmPanicSwap],
  ] = multicallData;

  let result = {};

  for (let i = 0; i < holders.length; i++) {
    const account = holders[i];
    const data = await getTokenBalance(
      provider,
      account,
      xftmFtmSupply,
      xftmFromXftmFtm,
      fsmFtmSupply,
      fsmFromFsmFtm,
      xftmFsmSupply,
      xftmFromXftmFsm,
      fsmFromXftmFsm,
      xftmFtmPanicSwapSupply,
      xftmFromXftmFtmPanicSwap
    );
    result[account] = data;
  }

  await fs.writeFile(
    `./output/snapshot-balance.json`,
    JSON.stringify(result, null, 2)
  );
};

const main = async () => {
  const provider = new JsonRpcProvider(RPC);
  await snapshotTokenBalance(provider);
};

main().catch((error) => {
  console.log("error", error);
});
