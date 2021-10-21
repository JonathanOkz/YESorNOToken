const YESorNOToken = artifacts.require("YESorNOToken");

const YESorNOVestingBatchRound1  = artifacts.require("YESorNOVestingBatchRound1.sol");
const YESorNOVestingBatchRound2  = artifacts.require("YESorNOVestingBatchRound2.sol");
const YESorNOVestingBatchRound3  = artifacts.require("YESorNOVestingBatchRound3.sol");
const YESorNOVestingBatchBonus   = artifacts.require("YESorNOVestingBatchBonus.sol");
const YESorNOVestingBatchAdvisor = artifacts.require("YESorNOVestingBatchAdvisor.sol");
const YESorNOVestingBatchTeam    = artifacts.require("YESorNOVestingBatchTeam.sol");
const YESorNOVestingBatchAirdrop = artifacts.require("YESorNOVestingBatchAirdrop.sol");

module.exports = async function (deployer, network, accounts) {
  const owner = accounts[0];

  await deployer.deploy(YESorNOToken, owner);

  await deployer.deploy(YESorNOVestingBatchRound1,  YESorNOToken.address);
  await deployer.deploy(YESorNOVestingBatchRound2,  YESorNOToken.address);
  await deployer.deploy(YESorNOVestingBatchRound3,  YESorNOToken.address);
  await deployer.deploy(YESorNOVestingBatchBonus,   YESorNOToken.address);
  await deployer.deploy(YESorNOVestingBatchAdvisor, YESorNOToken.address);
  await deployer.deploy(YESorNOVestingBatchTeam,    YESorNOToken.address);
  await deployer.deploy(YESorNOVestingBatchAirdrop, YESorNOToken.address);
};
