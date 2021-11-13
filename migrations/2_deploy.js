const YESorNOToken = artifacts.require("YESorNOToken");

const YESorNOVestingBatchRound1  = artifacts.require("YESorNOVestingBatchRound1.sol");
const YESorNOVestingBatchRound2  = artifacts.require("YESorNOVestingBatchRound2.sol");
const YESorNOVestingBatchRound3  = artifacts.require("YESorNOVestingBatchRound3.sol");
const YESorNOVestingBatchBonus   = artifacts.require("YESorNOVestingBatchBonus.sol");
const YESorNOVestingBatchAdvisor = artifacts.require("YESorNOVestingBatchAdvisor.sol");
const YESorNOVestingBatchTeam    = artifacts.require("YESorNOVestingBatchTeam.sol");
const YESorNOVestingBatchAirdrop = artifacts.require("YESorNOVestingBatchAirdrop.sol");

module.exports = async function (deployer, network, accounts) {

  let gnosis;
  switch (network) {
    case "development":
      gnosis = accounts[0];
      break;
    case "rinkeby":
      gnosis = '0x06A2582773f2A9C09812649a9f05071321E6C701';
      break;
    case "bsc":
      gnosis = '0xc6710A751935E5B837BA68414b82df754502feaA';
      break;
    default:
      gnosis = null;
      break;
  }

  if (/^0x[a-fA-F0-9]{40}$/.test(gnosis) === true) {
    // deploy token contract
    await deployer.deploy(YESorNOToken, gnosis);
    // deploy vesting contracts
    await deployer.deploy(YESorNOVestingBatchRound1,  YESorNOToken.address, gnosis);
    await deployer.deploy(YESorNOVestingBatchRound2,  YESorNOToken.address, gnosis);
    await deployer.deploy(YESorNOVestingBatchRound3,  YESorNOToken.address, gnosis);
    await deployer.deploy(YESorNOVestingBatchBonus,   YESorNOToken.address, gnosis);
    await deployer.deploy(YESorNOVestingBatchAdvisor, YESorNOToken.address, gnosis);
    await deployer.deploy(YESorNOVestingBatchTeam,    YESorNOToken.address, gnosis);
    await deployer.deploy(YESorNOVestingBatchAirdrop, YESorNOToken.address, gnosis);  
  }

};
