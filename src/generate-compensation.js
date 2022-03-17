const { BigNumber, ethers } = require("ethers");
const fs = require("fs/promises");

const main = async () => {
  const FTM_ALLOCATION = ethers.utils.parseEther("935000");
  const ZERO = BigNumber.from(0);

  const fileData = await fs.readFile("./output/xftm.json", "utf8");
  const xftmHolders = JSON.parse(fileData);

  const totalXftm = xftmHolders.reduce((acc, info) => {
    return acc.add(BigNumber.from(info.earnings));
  }, ZERO);

  const results = xftmHolders.map((item) => {
    return {
      address: item.address,
      ethAmount: BigNumber.from(item.earnings).mul(FTM_ALLOCATION).div(totalXftm)
    }
  }
  );

  await fs.writeFile(
    "./output/xftm-tx.json",
    JSON.stringify(results, null, 2)
  );
};

main().catch((error) => {
  console.log("error", error);
});
