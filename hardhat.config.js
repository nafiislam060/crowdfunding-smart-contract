require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const alchemyUrl = process.env.RPC_URL;
const privateKey = process.env.PRIVATE_KEY;
module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: alchemyUrl,
      accounts:[privateKey],
    },
  },
};
