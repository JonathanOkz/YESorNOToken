const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { shouldSupportInterfaces } = require('../../utils/introspection/SupportsInterface.behavior');

const { ZERO_ADDRESS } = constants;
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const MINTER_ROLE = web3.utils.soliditySha3('MINTER_ROLE');
const PAUSER_ROLE = web3.utils.soliditySha3('PAUSER_ROLE');
const SNAPER_ROLE = web3.utils.soliditySha3('SNAPER_ROLE');

function shouldBehaveLikeAccessControl (errorPrefix, owner, minter, pauser, snaper, other1, other2, minter2) {
  shouldSupportInterfaces(['AccessControl']);

  describe('granting', function () {
    beforeEach(async function () {
      await this.token.grantRole(MINTER_ROLE, minter, { from: owner });
      await this.token.grantRole(PAUSER_ROLE, pauser, { from: owner });
      await this.token.grantRole(SNAPER_ROLE, snaper, { from: owner });
    });

    it('non-admin cannot grant role to other accounts', async function () {
      await expectRevert(
        this.token.grantRole(SNAPER_ROLE, other2, { from: other1 }),
        `${errorPrefix}: account ${other1.toLowerCase()} is missing role`,
      );
    });

    it('accounts can be granted a role multiple times', async function () {
      await this.token.grantRole(MINTER_ROLE, minter, { from: owner });
      const receipt = await this.token.grantRole(MINTER_ROLE, minter, { from: owner });
      expectEvent.notEmitted(receipt, 'RoleGranted');
    });
  });

  describe('revoking', function () {
    it('roles that are not had can be revoked', async function () {
      expect(await this.token.hasRole(MINTER_ROLE, minter)).to.equal(false);

      const receipt = await this.token.revokeRole(MINTER_ROLE, minter, { from: owner });
      expectEvent.notEmitted(receipt, 'RoleRevoked');
    });

    context('with granted role', function () {
      beforeEach(async function () {
        await this.token.grantRole(MINTER_ROLE, minter, { from: owner });
      });

      it('admin can revoke role', async function () {
        const receipt = await this.token.revokeRole(MINTER_ROLE, minter, { from: owner });
        expectEvent(receipt, 'RoleRevoked', { account: minter, role: MINTER_ROLE, sender: owner });

        expect(await this.token.hasRole(MINTER_ROLE, minter)).to.equal(false);
      });

      it('non-admin cannot revoke role', async function () {
        await expectRevert(
          this.token.revokeRole(MINTER_ROLE, minter, { from: other1 }),
          `${errorPrefix}: account ${other1.toLowerCase()} is missing role`,
        );
      });

      it('a role can be revoked multiple times', async function () {
        await this.token.revokeRole(MINTER_ROLE, minter, { from: owner });

        const receipt = await this.token.revokeRole(MINTER_ROLE, minter, { from: owner });
        expectEvent.notEmitted(receipt, 'RoleRevoked');
      });
    });
  });

  describe('renouncing', function () {
    it('roles that are not had can be renounced', async function () {
      const receipt = await this.token.renounceRole(MINTER_ROLE, minter, { from: minter });
      expectEvent.notEmitted(receipt, 'RoleRevoked');
    });

    context('with granted role', function () {
      beforeEach(async function () {
        await this.token.grantRole(MINTER_ROLE, minter, { from: owner });
      });

      it('bearer can renounce role', async function () {
        const receipt = await this.token.renounceRole(MINTER_ROLE, minter, { from: minter });
        expectEvent(receipt, 'RoleRevoked', { account: minter, role: MINTER_ROLE, sender: minter });

        expect(await this.token.hasRole(MINTER_ROLE, minter)).to.equal(false);
      });

      it('only the sender can renounce their roles', async function () {
        await expectRevert(
          this.token.renounceRole(MINTER_ROLE, minter, { from: owner }),
          `${errorPrefix}: can only renounce roles for self`,
        );
      });

      it('a role can be renounced multiple times', async function () {
        await this.token.renounceRole(MINTER_ROLE, minter, { from: minter });

        const receipt = await this.token.renounceRole(MINTER_ROLE, minter, { from: minter });
        expectEvent.notEmitted(receipt, 'RoleRevoked');
      });
    });
  });
}

function shouldBehaveLikeAccessControlEnumerable (errorPrefix, owner, minter, pauser, snaper, other1, other2, minter2) {
  shouldSupportInterfaces(['AccessControlEnumerable']);

  describe('enumerating', function () {
    it('role bearers can be enumerated', async function () {
      await this.token.grantRole(MINTER_ROLE, minter, { from: owner });
      await this.token.grantRole(MINTER_ROLE, minter2, { from: owner });
      await this.token.grantRole(PAUSER_ROLE, pauser, { from: owner });
      await this.token.grantRole(SNAPER_ROLE, snaper, { from: owner });

      expect(await this.token.getRoleMemberCount(MINTER_ROLE)).to.bignumber.equal('3');
      expect(await this.token.getRoleMemberCount(PAUSER_ROLE)).to.bignumber.equal('2');
      expect(await this.token.getRoleMemberCount(SNAPER_ROLE)).to.bignumber.equal('2');

      const bearers = [];
      for (let i = 0; i < await this.token.getRoleMemberCount(MINTER_ROLE); ++i) {
        bearers.push(await this.token.getRoleMember(MINTER_ROLE, i));
      }
      expect(bearers).to.have.members([owner, minter, minter2]);
    });

    it('role enumeration should be in sync after renounceRole call', async function () {
      expect(await this.token.getRoleMemberCount(MINTER_ROLE)).to.bignumber.equal('1');
      await this.token.grantRole(MINTER_ROLE, minter, { from: owner });
      expect(await this.token.getRoleMemberCount(MINTER_ROLE)).to.bignumber.equal('2');
      await this.token.renounceRole(MINTER_ROLE, minter, { from: minter });
      expect(await this.token.getRoleMemberCount(MINTER_ROLE)).to.bignumber.equal('1');
    });
  });
}

function shouldBehaveLikeAccessControlEnumerableForToken (errorPrefix, owner, minter, pauser, snaper, other1, other2, minter2) {
  shouldSupportInterfaces(['AccessControlEnumerable']);

  const amount = new BN('200');

  it('owner has the default admin role', async function () {
    expect(await this.token.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).to.be.bignumber.equal('1');
    expect(await this.token.getRoleMember(DEFAULT_ADMIN_ROLE, 0)).to.equal(owner);
  });

  it('owner has the minter role', async function () {
    expect(await this.token.getRoleMemberCount(MINTER_ROLE)).to.be.bignumber.equal('1');
    expect(await this.token.getRoleMember(MINTER_ROLE, 0)).to.equal(owner);
  });

  it('owner has the pauser role', async function () {
    expect(await this.token.getRoleMemberCount(PAUSER_ROLE)).to.be.bignumber.equal('1');
    expect(await this.token.getRoleMember(PAUSER_ROLE, 0)).to.equal(owner);
  });

  describe('minting', function () {
    it('owner can mint tokens', async function () {
      const receipt = await this.token.mint(other1, amount, { from: owner });
      expectEvent(receipt, 'Transfer', { from: ZERO_ADDRESS, to: other1, value: amount });

      expect(await this.token.balanceOf(other1)).to.be.bignumber.equal(amount);
    });

    it('other1 accounts cannot mint tokens', async function () {
      await expectRevert(
        this.token.mint(other1, amount, { from: other1 }),
        `${errorPrefix}: must have minter role to mint`,
      );
    });

  });

  describe('pausing', function () {
    it('owner can pause', async function () {
      const receipt = await this.token.pause({ from: owner });
      expectEvent(receipt, 'Paused', { account: owner });

      expect(await this.token.paused()).to.equal(true);
    });

    it('owner can unpause', async function () {
      await this.token.pause({ from: owner });

      const receipt = await this.token.unpause({ from: owner });
      expectEvent(receipt, 'Unpaused', { account: owner });

      expect(await this.token.paused()).to.equal(false);
    });

    it('cannot mint while paused', async function () {
      await this.token.pause({ from: owner });

      await expectRevert(
        this.token.mint(other1, amount, { from: owner }),
        'ERC20Pausable: token transfer while paused',
      );
    });

    it('other1 accounts cannot pause', async function () {
      await expectRevert(
        this.token.pause({ from: other1 }),
        `${errorPrefix}: must have pauser role to pause`,
      );
    });

    it('other1 accounts cannot unpause', async function () {
      await this.token.pause({ from: owner });

      await expectRevert(
        this.token.unpause({ from: other1 }),
        `${errorPrefix}: must have pauser role to unpause`,
      );
    });
  });

  describe('burning', function () {
    it('holders can burn their tokens', async function () {
      await this.token.mint(other1, amount, { from: owner });

      const receipt = await this.token.burn(amount.subn(1), { from: other1 });
      expectEvent(receipt, 'Transfer', { from: other1, to: ZERO_ADDRESS, value: amount.subn(1) });

      expect(await this.token.balanceOf(other1)).to.be.bignumber.equal('1');
    });
  });

  describe('default owner role', function () {
    it('owner has default admin role', async function () {
      expect(await this.token.hasRole(DEFAULT_ADMIN_ROLE, owner)).to.equal(true);

      expect(await this.token.hasRole(MINTER_ROLE, owner)).to.equal(true);
      expect(await this.token.hasRole(PAUSER_ROLE, owner)).to.equal(true);
      expect(await this.token.hasRole(SNAPER_ROLE, owner)).to.equal(true);
    });
  });

  describe('test YESorNOToken functions with users-role', function () {
    it('test YESorNO Token functions', async function () {
      // test functions with owner
      expect(await this.token.mint(other1, 200, { from: owner }));
      expect(await this.token.snapshot({ from: owner }));
      expect(await this.token.pause({ from: owner }));
      expect(await this.token.unpause({ from: owner }));

      // test functions with users-role before assassination
      await expectRevert(this.token.mint(other1, 200, { from: minter }), `${errorPrefix}: must have minter role to mint`);
      await expectRevert(this.token.snapshot({ from: snaper }), `${errorPrefix}: must have snaper role for make a snapshot`);
      await expectRevert(this.token.pause({ from: pauser }), `${errorPrefix}: must have pauser role to pause`);
      await expectRevert(this.token.unpause({ from: pauser }), `${errorPrefix}: must have pauser role to unpause`);

      // test functions with users-role after assassination
      await this.token.grantRole(MINTER_ROLE, minter, { from: owner });
      await this.token.grantRole(PAUSER_ROLE, pauser, { from: owner });
      await this.token.grantRole(SNAPER_ROLE, snaper, { from: owner });
      expect(await this.token.mint(other1, 200, { from: minter }));
      expect(await this.token.snapshot({ from: snaper }));
      expect(await this.token.pause({ from: pauser }));
      expect(await this.token.unpause({ from: pauser }));

      // test functions with users lamda
      await expectRevert(this.token.mint(other1, 200, { from: other2 }), `${errorPrefix}: must have minter role to mint`);
      await expectRevert(this.token.snapshot({ from: other2 }), `${errorPrefix}: must have snaper role for make a snapshot`);
      await expectRevert(this.token.pause({ from: other2 }), `${errorPrefix}: must have pauser role to pause`);
      await expectRevert(this.token.unpause({ from: other2 }), `${errorPrefix}: must have pauser role to unpause`);

    });
  });
}


module.exports = {
  shouldBehaveLikeAccessControl,
  shouldBehaveLikeAccessControlEnumerable,
  shouldBehaveLikeAccessControlEnumerableForToken,
};
