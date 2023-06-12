// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

const wbnb_addr = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const wallet_addr = "0x1bf05Be2C1f069A323aF9157388822F0411583d8";

const vaultfactory_addr = "0x2b7477e6610a5667900ae5659DeF386322CDCF92"
const govToken_addr = "0xbD40C28B0005F858b93342d2495f6104Ecf27E9b"
const controller_addr = "0x91f6B61Fbbe7c78b7Bd55D9062B62600Bbd0523c"
const rewardsFactory_addr = "0xd68035fEC762a899B543B704fF6CCfcD121Be1b0"

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  // const unlockTime = currentTimestampInSeconds + 60;
  // const lockedAmount = hre.ethers.utils.parseEther("0.001");
  // const Lock = await hre.ethers.getContractFactory("Lock");
  // const lock = await Lock.deploy(unlockTime, { value: lockedAmount });
  // await lock.deployed();
  // console.log(
  //   `Lock with ${ethers.utils.formatEther(
  //     lockedAmount
  //   )}ETH and unlock timestamp ${unlockTime} deployed to ${lock.address}`
  // );


// vault factory deployment
  const VaultFactory = await ethers.getContractFactory("VaultFactory"); //Replace with name of your smart contract
  const vaultFactory = await VaultFactory.deploy(wallet_addr, wbnb_addr, wallet_addr);

// govtoken deployment
  const GovTokenFactory = await ethers.getContractFactory("GovToken"); //Replace with name of your smart contract
  const govTokenFactory = await GovTokenFactory.deploy();

// controller deployment
  const ControllerFactory = await ethers.getContractFactory("Controller"); //Replace with name of your smart contract
  const controllerFactory = await ControllerFactory.deploy(vaultfactory_addr);

// pausableRewardsFactory deployment
  const RewardsFactory = await ethers.getContractFactory("RewardsFactory"); //Replace with name of your smart contract
  const rewardsFactory = await RewardsFactory.deploy(govToken_addr, vaultfactory_addr);

  // console.log("rewardsFactory address:", rewardsFactory.address);



}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
