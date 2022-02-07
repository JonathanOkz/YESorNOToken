const { BN, constants, expectRevert, time } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const YESorNOToken = artifacts.require('YESorNOToken');
const VestingSingleRevocable = artifacts.require('VestingSingleRevocable');

contract('VestingSingleRevocable', function (accounts) {
  const [ owner, beneficiary, revoker ] = accounts;

  const name = 'YESorNO';
  const symbol = 'YON';

  const amount = new BN('1000');
  const ZERO_amount = new BN(0);

  context('with token', function () {
    beforeEach(async function () {
      this.now = await time.latest();
      this.token = await YESorNOToken.new(owner);
    });


    context('once deployed', function () {
      const DAY = new BN(86400);
      const delay = new BN(365);
      const duration = new BN(150);
      let tokenVesting_start = 0;

      beforeEach(async function () {
        this.tokenVesting = await VestingSingleRevocable.new(this.token.address, beneficiary, delay, duration, revoker, {from: owner}),
        tokenVesting_start = await this.tokenVesting.getStart();
        await this.token.mint(this.tokenVesting.address, amount, {from: owner});

        console.log( "tokenVesting getToken():", await this.tokenVesting.getToken(), "| token address:", this.token.address );
        expect(await this.tokenVesting.getToken()).to.equal(this.token.address);
      });

      it('revoke at beginning', async function () {
        expect(await this.tokenVesting.getRevoked()).to.be.false
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal(ZERO_amount);
        await this.tokenVesting.revoke({from: revoker})
        expect(await this.tokenVesting.getRevoked()).to.be.true
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal(ZERO_amount);
      });

      it('revoke in acquisition period', async function () {
        await time.increaseTo( tokenVesting_start.add(time.duration.days(50)) );
        expect(await this.tokenVesting.getRevoked()).to.be.false
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.gt(ZERO_amount).lt(amount);

        console.log( "\n-- before revoke --\n")

        const getReleasable1 = await this.tokenVesting.getReleasable()
        const getReleased1 = await this.tokenVesting.getReleased()
        const getLocked1 = await this.tokenVesting.getLocked()
        const getVested1 = await this.tokenVesting.getVested()

        console.log( "before getReleasable:", (getReleasable1).toString() )
        console.log( "before getReleased:", (getReleased1).toString() )
        console.log( "before getLocked:", (getLocked1).toString() )
        console.log( "before getVested:", (getVested1).toString() )
        console.log( "before beneficiary:", (await this.token.balanceOf(beneficiary)).toString() )
        console.log( "before contract:", (await this.token.balanceOf(this.tokenVesting.address)).toString() )
        
        await this.tokenVesting.revoke({from: revoker})
        expect(await this.tokenVesting.getRevoked()).to.be.true

        console.log( "\n-- after revoke --\n")

        const getReleasable2 = await this.tokenVesting.getReleasable()
        const getReleased2 = await this.tokenVesting.getReleased()
        const getLocked2 = await this.tokenVesting.getLocked()
        const getVested2 = await this.tokenVesting.getVested()

        console.log( "after getReleasable:", (getReleasable2).toString() )
        console.log( "after getReleased:", (getReleased2).toString() )
        console.log( "after getLocked:", (getLocked2).toString() )
        console.log( "after getVested:", (getVested2).toString() )
        console.log( "after beneficiary:", (await this.token.balanceOf(beneficiary)).toString() )
        console.log( "after contract:", (await this.token.balanceOf(this.tokenVesting.address)).toString() )

        expect(getReleasable2).to.be.bignumber.equal(getReleasable1).to.be.bignumber.equal(new BN(333));
        expect(getReleased2).to.be.bignumber.equal(getReleased1).to.be.bignumber.equal(ZERO_amount);
        expect(getLocked1).to.be.bignumber.equal(new BN(667));
        expect(getLocked2).to.be.bignumber.equal(ZERO_amount);
        expect(getVested2).to.be.bignumber.equal(getReleasable2);
        expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal(ZERO_amount);

        await this.tokenVesting.release({from: beneficiary});
        expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal(getVested2);

        console.log( "\n-- after release --\n")
        console.log( "after getReleasable:", (await this.tokenVesting.getReleasable()).toString() )
        console.log( "after getReleased:", (await this.tokenVesting.getReleased()).toString() )
        console.log( "after getLocked:", (await this.tokenVesting.getLocked()).toString() )
        console.log( "after getVested:", (await this.tokenVesting.getVested()).toString() )
        console.log( "after beneficiary:", (await this.token.balanceOf(beneficiary)).toString() )
        console.log( "after contract:", (await this.token.balanceOf(this.tokenVesting.address)).toString() )
      });

      it('revoke in acquisition period after user release once', async function () {
        await time.increaseTo( tokenVesting_start.add(time.duration.days(50)) );
        expect(await this.tokenVesting.getRevoked()).to.be.false
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.gt(ZERO_amount).to.be.bignumber.lt(amount);

        await this.tokenVesting.release({from: beneficiary});

        console.log( "\n-- before revoke --\n")

        const getReleasable1 = await this.tokenVesting.getReleasable()
        const getReleased1 = await this.tokenVesting.getReleased()
        const getLocked1 = await this.tokenVesting.getLocked()
        const getVested1 = await this.tokenVesting.getVested()

        console.log( "before getReleasable:", (getReleasable1).toString() )
        console.log( "before getReleased:", (getReleased1).toString() )
        console.log( "before getLocked:", (getLocked1).toString() )
        console.log( "before getVested:", (getVested1).toString() )
        console.log( "before beneficiary:", (await this.token.balanceOf(beneficiary)).toString() )
        
        await this.tokenVesting.revoke({from: revoker})
        expect(await this.tokenVesting.getRevoked()).to.be.true

        console.log( "\n-- after revoke --\n")

        const getReleasable2 = await this.tokenVesting.getReleasable()
        const getReleased2 = await this.tokenVesting.getReleased()
        const getLocked2 = await this.tokenVesting.getLocked()
        const getVested2 = await this.tokenVesting.getVested()

        console.log( "after getReleasable:", (getReleasable2).toString() )
        console.log( "after getReleased:", (getReleased2).toString() )
        console.log( "after getLocked:", (getLocked2).toString() )
        console.log( "after getVested:", (getVested2).toString() )
        console.log( "after beneficiary:", (await this.token.balanceOf(beneficiary)).toString() )

        expect(getReleasable2).to.be.bignumber.equal(getReleasable1).to.be.bignumber.equal(ZERO_amount);
        expect(getReleased2).to.be.bignumber.equal(getReleased1).to.be.bignumber.equal( new BN(333) );
        expect(getVested2).to.be.bignumber.equal(ZERO_amount);
        expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal(getReleased1);
      });

    });
  });
});
