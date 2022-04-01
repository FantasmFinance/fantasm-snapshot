const { BigNumber, ethers } = require("ethers");
const fs = require("fs/promises");

const main = async () => {
  const FTM_ALLOCATION = ethers.utils.parseEther("30000");
  const ZERO = BigNumber.from(0);

  const fsmFileData = await fs.readFile("./output/fsm.json", "utf8");
  const fsmHolders = JSON.parse(fsmFileData);

  const totalFsm = fsmHolders.reduce((acc, info) => {
    return acc.add(BigNumber.from(info.earnings));
  }, ZERO);

  const fsmResults = fsmHolders.map((item) => {
    return {
      address: item.address,
      ethAmount: ethers.utils.formatEther(
        BigNumber.from(item.earnings).mul(FTM_ALLOCATION).div(totalFsm)
      ),
    };
  });

  await fs.writeFile("./output/fsm-tx.json", JSON.stringify(fsmResults, null, 2));
};

main().catch((error) => {
  console.log("error", error);
});
