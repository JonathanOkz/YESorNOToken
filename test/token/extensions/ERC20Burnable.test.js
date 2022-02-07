const { BN } = require('@openzeppelin/test-helpers');

const { shouldBehaveLikeERC20Burnable } = require('./ERC20Burnable.behavior');
const YESorNOToken = artifacts.require('YESorNOToken');

contract('ERC20Burnable', function (accounts) {
  const [ owner, recipient, anotherAccount ] = accounts;

  const initialBalance = new BN(1000);

  const name = 'YESorNO';
  const symbol = 'YON';

  beforeEach(async function () {
    this.token = await YESorNOToken.new(owner, { from: owner });
    await this.token.mint(owner, initialBalance, { from: owner });
  });

  shouldBehaveLikeERC20Burnable(owner, initialBalance, [recipient, anotherAccount]);
});
