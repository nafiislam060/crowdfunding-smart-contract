const { ethers } = require("hardhat"); // ✅ add this

async function main() {
  const Contract = await ethers.getContractFactory("Crowdfunding");

  const contract = await Contract.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("Deployed to:", address);
}

// ✅ add error handling
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});