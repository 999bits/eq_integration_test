const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { impersonates, depositVault, setupCoreProtocol, advanceNBlock } = require("./utils.js");
const { send } = require("@openzeppelin/test-helpers");
const BigNumber = require("bignumber.js");

const {controllerABI} = require("./controller.js");
const {vaultFactoryABI, vaultFactoryByteCode} = require("./vaultFactory.js");
const {rewardsFactoryABI} = require("./rewardsFactory.js");
const {y2kTokenABI} = require("./y2kToken.js");
const {y2kTreasuryABI} = require("./y2kTreasury.js");
const {wethABI} = require("./weth.js");
const { currentBlock, advanceBlockTo } = require("./Time");

const weth_addr = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const dai_addr = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";

const controller_addr = "0x225aCF1D32f0928A96E49E6110abA1fdf777C85f";
const vault_factory_addr = "0x984E0EB8fB687aFa53fc8B33E12E04967560E092";
const rewards_factory_addr = "0x9889Fca1d9A5D131F5d4306a2BC2F293cAfAd2F3";
const y2k_token_addr = "0x65c936f008BC34fE819bce9Fa5afD9dc2d49977f";
const y2k_treasury_addr = "0x5c84cf4d91dc0acde638363ec804792bb2108258";
const aggregator_addr = "0xc5c8e77b397e531b8ec06bfb0048328b30e9ecfb";   //  DAI/USD aggregator

describe("Integration test for Y2K Earthquake Contracts on Arbitrum mainnet", function () {
  let weth;
  let accounts;
  let governance;
//   let farmer1 = "0x3e0199792Ce69DC29A0a36146bFa68bd7C8D6633";   // real address that holds weth in arbitrum mainnet
  let farmer1;
  let controller;
  let vaultFactory;
  let rewardsFactory;
  let y2kToken;
  let y2kTreasury;
  let vault;
  let farmerBalance;
  let underlying;
  let vaultFactory_owner = "0x45aA9d8B9D567489be9DeFcd085C6bA72BBf344F";
  let underlyingWhale;

  async function setupExternalContracts() {

    weth = await ethers.getContractAt('WETH', weth_addr); // weth address on mainnet
    // weth = await ethers.getContractAt(wethABI, weth_addr); // weth address on mainnet
    underlying = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', dai_addr); // weth address on mainnet
    controller = await ethers.getContractAt(controllerABI, controller_addr); // controller address on mainnet
    vaultFactory = await ethers.getContractAt(vaultFactoryABI, vault_factory_addr); // vaultFactory address on mainnet
    rewardsFactory = await ethers.getContractAt(rewardsFactoryABI, rewards_factory_addr); // rewardsFactory address on mainnet
    y2kToken = await ethers.getContractAt(y2kTokenABI, y2k_token_addr); // y2kToken address on mainnet
    y2kTreasury = await ethers.getContractAt(y2kTreasuryABI, y2k_treasury_addr); // y2kTreasury address on mainnet

    console.log("Fetching Underlying at: ", underlying.address);
    console.log("Fetching controller at: ", controller.address);
    console.log("Fetching vaultFactory at: ", vaultFactory.address);
    console.log("Fetching rewardsFactory at: ", rewardsFactory.address);
    console.log("Fetching y2kToken at: ", y2kToken.address);
    console.log("Fetching y2kTreasury at: ", y2kTreasury.address);

  }

  async function setupBalance(){

    [farmer1,] = await ethers.getSigners();
    await weth.connect(farmer1).deposit({value: ethers.utils.parseEther("10")});
    console.log(await weth.balanceOf(farmer1.address));

  }

  before(async function() {

    // impersonate accounts
    await impersonates([vaultFactory_owner]); //farmer1
    await setupExternalContracts();
    await setupBalance();

  });

  describe("Happy path", function() {
    it("Farmer should hedge with deposit to hedge vault in the depeg event", async function() {
        const signer = await ethers.getSigner(vaultFactory_owner);

        let farmerOldWETHBalance = await weth.balanceOf(farmer1.address);
        console.log("farmerOldWETHBalance", farmerOldWETHBalance);
      
      // Create market place
        const tx = await vaultFactory.connect(signer).createNewMarket(5, dai_addr, 99000000, 1696230000, 1696269600, aggregator_addr, "y2kWETH_99*JUNE");
        const receipt = await tx.wait();
        
        const event = receipt.events.find((e) => e.event === "MarketCreated");
        const marketIndex = event.args[0];
        const hedgeVault_addr = event.args[1];
        const riskVault_addr = event.args[2];
        
        console.log("marketIndex", marketIndex);
        console.log("hedgeVault_addr", hedgeVault_addr);
        console.log("riskVault_addr", riskVault_addr);        

        const oracle_addr = await vaultFactory.tokenToOracle(dai_addr);
        console.log("oracle_addr",oracle_addr);
        
        const currentTokenPrice = await controller.getLatestPrice(dai_addr);
        console.log("currentTokenPrice",currentTokenPrice);
        
      // Create StakingRewards
        const tx_rewards = await rewardsFactory.connect(signer).createStakingRewards(marketIndex, 1696269600);
        const rewards = await tx_rewards.wait();
        const rewards_event = rewards.events.find((e) => e.event === "CreatedStakingReward");
        const insrStake_addr = rewards_event.args[2];
        const riskStake_addr = rewards_event.args[3];
        console.log("insrStake_addr", insrStake_addr);
        console.log("riskStake_addr", riskStake_addr);    

      ////////////////  Getting part of deployed Vault & StakingRewards contracts  /////////////

        const vaultArtifacts = await hre.artifacts.readArtifact("IVault");
        const vaultABI = vaultArtifacts.abi;
        const hedgeVaultContract = await ethers.getContractAt(vaultABI, hedgeVault_addr);

        const stakingRewardsArtifacts = await hre.artifacts.readArtifact("IStakingRewards");
        const stakingRewardsABI = stakingRewardsArtifacts.abi;
        const stakingRewardsContract = await ethers.getContractAt(stakingRewardsABI, insrStake_addr);

      //////////////////////////////////////////////////////////////////////////////////////////

      // Deposit weth to hedge vault
        const depositAmount = ethers.utils.parseEther("0.5");
        await hedgeVaultContract.connect(farmer1).depositETH(1696269600, farmer1.address, {value: depositAmount});
        console.log("after deposit ...",await weth.balanceOf(farmer1.address));
      
      // Transfer shares to 3rd parth, StakingRewards
        // await hedgeVaultContract.connect(farmer1).approve(insrStake_addr, true);
        // await stakingRewardsContract.connect(farmer1).stake(depositAmount);

      // Trigger epoch event
        // await controller.connect(signer).triggerDepeg(marketIndex, 1696269600);

      // Using half days is to simulate how we doHardwork in the real world
        const startBlock = await currentBlock();
        console.log("startBlock", startBlock);

        await advanceBlockTo(startBlock.add(500))
        const endBlock = await currentBlock();
        console.log("endBlock", endBlock);
          
        let farmerWETHBalanceAfterDeposit = await weth.balanceOf(farmer1.address);
        console.log("farmerWETHBalanceAfterDeposit", farmerWETHBalanceAfterDeposit);


    });

  });




});
