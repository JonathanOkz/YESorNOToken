const {
  shouldBehaveLikeAccessControl,
  shouldBehaveLikeAccessControlEnumerable,
  shouldBehaveLikeAccessControlEnumerableForToken,
} = require('./AccessControl.behavior.js');

const YESorNOToken = artifacts.require('YESorNOToken');


contract('AccessControl', function (accounts) {
  const [ owner, minter, pauser, snaper, other1, other2, minter2 ] = accounts;

  beforeEach(async function () {
    this.token = await YESorNOToken.new(accounts[0], { from: accounts[0] });
  });

  shouldBehaveLikeAccessControl('AccessControl', owner, minter, pauser, snaper, other1, other2, minter2);
  shouldBehaveLikeAccessControlEnumerable('AccessControl', owner, minter, pauser, snaper, other1, other2, minter2);
  shouldBehaveLikeAccessControlEnumerableForToken('YESorNOToken', owner, minter, pauser, snaper, other1, other2, minter2);
});
