const { BN, constants, expectRevert, time } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const YESorNOToken = artifacts.require('YESorNOToken');
const VestingSingle = artifacts.require('VestingSingle');


contract('VestingSingle big supply', function (accounts) {
  const [ owner, beneficiary ] = accounts;

  const name = 'YESorNO';
  const symbol = 'YON';

  const amount = new BN('1000000000');
  const ZERO_amount = new BN(0)

  context('with token', function () {
    const DAY = new BN(86400);
      const delay = new BN(365);
      const duration = new BN(150);
      let tokenVesting_start = 0;
      
      

    beforeEach(async function () {
      this.now = await time.latest();
      this.token = await YESorNOToken.new(owner);
    });

    beforeEach(async function () {
      this.tokenVesting = await VestingSingle.new(this.token.address, beneficiary, delay, duration, {from: owner}),
      tokenVesting_start = await this.tokenVesting.getStart();
      await this.token.mint(this.tokenVesting.address, amount, {from: owner});

      console.log( "tokenVesting getToken():", await this.tokenVesting.getToken(), "| token address:", this.token.address );
      expect(await this.tokenVesting.getToken()).to.equal(this.token.address);
    });

    it('get releasable amount function of time', async function () {

      // 1 second before
      await time.increaseTo( tokenVesting_start.sub(time.duration.seconds(1)) );
      expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal(ZERO_amount);

      // on time
      await time.increaseTo( tokenVesting_start );
      expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal(ZERO_amount);

      // 1 second after
      await time.increaseTo( tokenVesting_start.add(time.duration.seconds(1)) );
      expect(await this.tokenVesting.getReleasable()).to.be.bignumber.gt(ZERO_amount);
    });

    it('release recursive', async function () {

      let sum = new BN(0);

      const tokenVesting = this.tokenVesting;
      const token = this.token;

      const releaseRecursive = async function(i) {
        if (sum.gte(amount)) {
          return
        }
        await time.increaseTo( tokenVesting_start.add(time.duration.seconds(1 * i)) );

        await tokenVesting.release({from: beneficiary});
        sum = await token.balanceOf(beneficiary)
        console.log("=>", Math.round(i/86400), "days:",  (sum).toString() )

        expect(await tokenVesting.getReleased()).to.be.bignumber.equal( sum );
        expect(await tokenVesting.getReleasable()).to.be.bignumber.equal( ZERO_amount );
        expect(await tokenVesting.getLocked()).to.be.bignumber.equal( amount.sub(sum) );
        expect(await tokenVesting.getVested()).to.be.bignumber.equal( amount.sub(sum) );

        return releaseRecursive(i += (Math.random()*86400) )
      }

      await releaseRecursive(400)
      expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal(amount);

      expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( amount );
      expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( ZERO_amount );
      expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( ZERO_amount );
      expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( ZERO_amount );

      console.log("=>", (await token.balanceOf(beneficiary)).toString() )
      await expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingSingle: no tokens to release');

    });
});
});

contract('VestingSingle', function (accounts) {
  const [ owner, beneficiary ] = accounts;

  const name = 'YESorNO';
  const symbol = 'YON';

  const amount = new BN('10000');
  const ZERO_amount = new BN(0)

  context('with token', function () {
    beforeEach(async function () {
      this.now = await time.latest();
      this.token = await YESorNOToken.new(owner);
    });

    it('rejects a release time in the past', async function () {

      await expectRevert(
        VestingSingle.new(this.token.address, ZERO_ADDRESS, 10, 30, {from: owner}),
        'VestingSingle: beneficiary is the zero address',
      );

      await expectRevert(
        VestingSingle.new(this.token.address, beneficiary, -1, 30, {from: owner}),
        'value out-of-bounds (argument="delayInDay", value=-1, code=INVALID_ARGUMENT, version=abi/5.0.7)',
      );
      await expectRevert(
        VestingSingle.new(this.token.address, beneficiary, 3651, 30, {from: owner}),
        'VestingReleaseLinear: delayInDay must be greater (or equal) than 0 and less than 3651',
      );

      await expectRevert(
        VestingSingle.new(this.token.address, beneficiary, 10, 3651, {from: owner}),
        'VestingReleaseLinear: durationInDay must be greater (or equal) than 0 and less than 3651',
      );
    });

    context('once deployed', function () {
      const DAY = new BN(86400);
      const delay = new BN(365);
      const duration = new BN(150);
      let tokenVesting_start = 0;
      beforeEach(async function () {
        this.tokenVesting = await VestingSingle.new(this.token.address, beneficiary, delay, duration, {from: owner}),
        tokenVesting_start = await this.tokenVesting.getStart();
        await this.token.mint(this.tokenVesting.address, amount, {from: owner});
      });

      it('can get state', async function () {
        expect(await this.tokenVesting.getBeneficiary()).to.equal(beneficiary);
        expect(await this.tokenVesting.getDuration()).to.be.bignumber.equal(duration.mul(new BN(DAY)));
      });

      it('cannot be released before time limit', async function () {
        await expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingSingle: no tokens to release');
        expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal(ZERO_amount);
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal(ZERO_amount);
        expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal(amount);
        expect(await this.tokenVesting.getVested()).to.be.bignumber.equal(amount);
      });

      it('cannot be released just before time limit', async function () {
        await time.increaseTo( tokenVesting_start );
        await expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingSingle: no tokens to release');
        expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal(ZERO_amount);
      });

      it('get releasable amount function of time', async function () {
        // 2 day after
        await time.increaseTo( tokenVesting_start.add(time.duration.days(2)) );
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal(new BN(133));

        // on delay
        await time.increaseTo( tokenVesting_start.add(time.duration.days(duration)) );
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal(amount);

        // 2 day after delay
        await time.increaseTo( tokenVesting_start.add(time.duration.days(duration)).add(time.duration.days(2)) );
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal(amount);
      });

      it('can be released just after limit', async function () {
        // release 1 second after start date
        const value = new BN(66);
        await time.increaseTo( tokenVesting_start.add(time.duration.days(1)) );

        expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( ZERO_amount );
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( value );
        expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( amount.sub(value) );
        expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( amount );

        await this.tokenVesting.release({from: beneficiary});
        expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal(value);

        expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( value );
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( ZERO_amount );
        expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( amount.sub(value) );
        expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( amount.sub(value) );

        // release 500 days after start date
        await time.increaseTo( tokenVesting_start.add(time.duration.days(500)) );

        expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( value );
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( amount.sub(value) );
        expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( ZERO_amount );
        expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( amount.sub(value) );

        await this.tokenVesting.release({from: beneficiary});
        expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal(amount);

        expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( amount );
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( ZERO_amount );
        expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( ZERO_amount );
        expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( ZERO_amount );

        await expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingSingle: no tokens to release');
      });

      it('can be released total amount after delay time', async function () {
        await time.increaseTo( tokenVesting_start.add(time.duration.days(500)) );

        expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( ZERO_amount );
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( amount );
        expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( ZERO_amount );
        expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( amount );

        await this.tokenVesting.release({from: beneficiary});
        expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal(amount);

        expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( amount );
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( ZERO_amount );
        expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( ZERO_amount );
        expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( ZERO_amount );

        await expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingSingle: no tokens to release');
      });

      it('cannot be released twice', async function () {
        await time.increaseTo( tokenVesting_start.add(time.duration.days(50)) );

        expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal( ZERO_amount );
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( new BN(3333) );

        await Promise.all([
          this.tokenVesting.release({from: beneficiary}),
          expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingSingle: no tokens to release'),
          expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingSingle: no tokens to release'),
          expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingSingle: no tokens to release'),
          expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingSingle: no tokens to release'),
          expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingSingle: no tokens to release'),
          expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingSingle: no tokens to release'),
        ])

        expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal( new BN(3333) );
        expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( ZERO_amount );

      });

    });

  });
});
