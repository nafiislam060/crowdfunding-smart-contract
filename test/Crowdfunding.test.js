const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Crowdfunding", function () {
  let contract, owner, user1, user2;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    contract = await Crowdfunding.deploy();
    await contract.waitForDeployment();
  });

  // 1. Deploy
  it("Should deploy correctly", async () => {
    expect(await contract.owner()).to.equal(owner.address);
  });

  // 2. Create Campaign
  it("Should create campaign successfully", async () => {
    await contract.createCampaign("Test", "Desc", 1000, 5);

    const campaign = await contract.campaigns(1);
    expect(campaign.goalAmount).to.equal(1000);
  });

  // 3. Fail create with 0 goal
  it("Should fail if goal is 0", async () => {
    await expect(
      contract.createCampaign("Test", "Desc", 0, 5)
    ).to.be.revertedWith("Goal must be > 0");
  });

  // 4. Contribute
  it("Should allow users to contribute", async () => {
    await contract.createCampaign("Test", "Desc", 1000, 5);

    await contract.connect(user1).contribute(1, { value: 500 });

    const amount = await contract.contributions(1, user1.address);
    expect(amount).to.equal(500);
  });

  // 5. Contribute fail 0 ETH
  it("Should fail if contribution is 0", async () => {
    await contract.createCampaign("Test", "Desc", 1000, 5);

    await expect(
      contract.connect(user1).contribute(1, { value: 0 })
    ).to.be.revertedWith("Send ETH");
  });

  // 6. Contribute after deadline fail
  it("Should fail if contribute after deadline", async () => {
    await contract.createCampaign("Test", "Desc", 1000, 1);

    await time.increase(2 * 24 * 60 * 60);

    await expect(
      contract.connect(user1).contribute(1, { value: 500 })
    ).to.be.revertedWith("Campaign ended");
  });

  // 7. Claim success
  it("Creator should claim funds if goal met", async () => {
    await contract.createCampaign("Test", "Desc", 1000, 1);

    await contract.connect(user1).contribute(1, { value: 1000 });

    await time.increase(2 * 24 * 60 * 60);

    await contract.claimFunds(1);

    const campaign = await contract.campaigns(1);
    expect(campaign.claimed).to.equal(true);
  });

  // 8. Claim fail (non creator)
  it("Non creator cannot claim funds", async () => {
    await contract.createCampaign("Test", "Desc", 1000, 1);

    await contract.connect(user1).contribute(1, { value: 1000 });

    await time.increase(2 * 24 * 60 * 60);

    await expect(
      contract.connect(user1).claimFunds(1)
    ).to.be.revertedWith("Not campaign creator");
  });

  // 9. Refund success
  it("User should get refund if goal not met", async () => {
    await contract.createCampaign("Test", "Desc", 1000, 1);

    await contract.connect(user1).contribute(1, { value: 500 });

    await time.increase(2 * 24 * 60 * 60);

    await contract.connect(user1).refund(1);

    const amount = await contract.contributions(1, user1.address);
    expect(amount).to.equal(0);
  });

  // 10. Refund fail if goal met
  it("Should fail refund if goal is met", async () => {
    await contract.createCampaign("Test", "Desc", 1000, 1);

    await contract.connect(user1).contribute(1, { value: 1000 });

    await time.increase(2 * 24 * 60 * 60);

    await expect(
      contract.connect(user1).refund(1)
    ).to.be.revertedWith("Goal was met");
  });

  // 11. Double refund fail
  it("Should not allow double refund", async () => {
    await contract.createCampaign("Test", "Desc", 1000, 1);

    await contract.connect(user1).contribute(1, { value: 500 });

    await time.increase(2 * 24 * 60 * 60);

    await contract.connect(user1).refund(1);

    await expect(
      contract.connect(user1).refund(1)
    ).to.be.revertedWith("No contribution");
  });
});