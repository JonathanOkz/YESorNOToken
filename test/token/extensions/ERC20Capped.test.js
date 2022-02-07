const { BN, ether, expectRevert } = require('@openzeppelin/test-helpers');
const { shouldBehaveLikeERC20Capped } = require('./ERC20Capped.behavior');

const YESorNOToken = artifacts.require('YESorNOToken');

contract('ERC20Capped', function (accounts) {
  const [ minter, ...otherAccounts ] = accounts;

  const cap = new BN('9000000000000000000000000000') // ether('9000000000');

  const name = 'YESorNO';
  const symbol = 'YON';

  context('once deployed', async function () {
    beforeEach(async function () {
      this.token = await YESorNOToken.new(minter, { from: minter });
    });

    shouldBehaveLikeERC20Capped(minter, otherAccounts, cap);
  });
});