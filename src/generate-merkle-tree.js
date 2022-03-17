const { BigNumber } = require("ethers");
const fs = require("fs/promises");

const main = async () => {
  const fileData = await fs.readFile("./output/snapshot-balance.json", "utf8");
  const holders = JSON.parse(fileData);

  const xftmResult = Object.entries(holders)
    .filter(([, info]) => info.xftm.total !== "0")
    .map(([key, info]) => {
      return {
        address: key,
        earnings: BigNumber.from(info.xftm.total).toHexString(),
        reasons: "",
      };
    });

  const fsmResult = Object.entries(holders)
    .filter(([, info]) => info.fsm.total !== "0")
    .map(([key, info]) => {
      return {
        address: key,
        earnings: BigNumber.from(info.fsm.total).toHexString(),
        reasons: "",
      };
    });

  await fs.writeFile(`./output/xftm.json`, JSON.stringify(xftmResult, null, 2));
  await fs.writeFile(`./output/fsm.json`, JSON.stringify(fsmResult, null, 2));
};

main().catch((error) => {
  console.log("error", error);
});