const { BN, constants, expectRevert, time } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const YESorNOToken = artifacts.require('YESorNOToken');
const StackingBatch = artifacts.require('StackingBatch');

contract('StackingBatch big supply', function (accounts) {
  const [ owner, beneficiary1, beneficiary2, beneficiary3, beneficiary4, other ] = accounts;

  const decimals = '000000000000000000';

  const pool_amount = new BN('500000'+decimals);

  const small_amount = new BN('150000'+decimals);
  const medium_amount = new BN('500000'+decimals);
  const large_amount = new BN('1500000'+decimals);

  const amountX = new BN('21000000000');
  const ZERO_amount = new BN(0)

  context('with token', function () {
      const delay = new BN(180);

    beforeEach(async function () {
      this.now = await time.latest();
      this.token = await YESorNOToken.new(owner);
    });

    beforeEach(async function () {
      this.tokenStacking = await StackingBatch.new(this.token.address, delay, {from: owner}),
      
      console.log( "tokenVesting getToken():", await this.tokenStacking.getToken(), "| token address:", this.token.address );
      expect(await this.tokenStacking.getToken()).to.equal(this.token.address);
    });

    it('StackingBatch tests', async function () {

      // mint tokens for all beneficiaries
      await this.token.mint(beneficiary1, small_amount, {from: owner});
      await this.token.mint(beneficiary2, large_amount, {from: owner});
      await this.token.mint(beneficiary3, medium_amount, {from: owner});
      await this.token.mint(beneficiary4, amountX, {from: owner});
      await this.token.mint(other, pool_amount, {from: owner});

      // approve tokens for all beneficiaries
      await this.token.approve(this.tokenStacking.address, small_amount, {from: beneficiary1});
      await this.token.approve(this.tokenStacking.address, large_amount, {from: beneficiary2});
      await this.token.approve(this.tokenStacking.address, medium_amount, {from: beneficiary3});
      await this.token.approve(this.tokenStacking.address, amountX, {from: beneficiary4});
      await this.token.approve(this.tokenStacking.address, pool_amount, {from: other});

      // try to join stacking programme before refill rewards pool
      await expectRevert( this.tokenStacking.join(medium_amount, {from: beneficiary3}), 'StackingBatch: no enough tokens available for gift' )

      // check that rewards pool equal zero
      expect(await this.tokenStacking.getPool({from: other})).to.be.bignumber.equal(ZERO_amount);

      // try to add zero token in rewards pool
      await expectRevert( this.tokenStacking.increaseRewardPool(ZERO_amount, {from: other}), 'StackingBatch: amount must be greater than 0' )

      // add tokens in rewards pool and check that `getPool` return right amount
      await this.tokenStacking.increaseRewardPool(pool_amount, {from: other});
      expect(await this.tokenStacking.getPool({from: other})).to.be.bignumber.equal(pool_amount);

      // join stacking programme for beneficiary1, beneficiary2 and beneficiary3
      await this.tokenStacking.join(small_amount, {from: beneficiary1});
      await this.tokenStacking.join(large_amount, {from: beneficiary2});
      await this.tokenStacking.join(medium_amount, {from: beneficiary3});
      // try to join stacking programme twice for beneficiary3
      await expectRevert( this.tokenStacking.join(medium_amount, {from: beneficiary3}), 'StackingBatch: stacker already exist' )
      // try to join stacking programme with a bad amount for beneficiary4
      await expectRevert( this.tokenStacking.join(amountX, {from: beneficiary4}), 'StackingBatch: amount is unsuitable' )

      // check that all getters return the right values for beneficiary1
      expect(await this.tokenStacking.getStacked({from: beneficiary1})).to.be.bignumber.equal(small_amount);
      expect(await this.tokenStacking.getReleasable({from: beneficiary1})).to.be.bignumber.equal(small_amount.add(new BN('10500'+decimals)));
      expect(await this.tokenStacking.getGiftAmount({from: beneficiary1})).to.be.bignumber.equal(new BN('10500'+decimals));
      expect(await this.tokenStacking.getGiftNoAds({from: beneficiary1})).equal(true);
      expect(await this.tokenStacking.getGiftExclusiveAvantage({from: beneficiary1})).equal(false);
      expect(await this.tokenStacking.exist({from: beneficiary1})).equal(true);
      expect(await this.tokenStacking.released({from: beneficiary1})).equal(false);

      // check that all getters return the right values for beneficiary2
      expect(await this.tokenStacking.getStacked({from: beneficiary2})).to.be.bignumber.equal(large_amount);
      expect(await this.tokenStacking.getReleasable({from: beneficiary2})).to.be.bignumber.equal(large_amount.add(new BN('225000'+decimals)));
      expect(await this.tokenStacking.getGiftAmount({from: beneficiary2})).to.be.bignumber.equal(new BN('225000'+decimals));
      expect(await this.tokenStacking.getGiftNoAds({from: beneficiary2})).equal(true);
      expect(await this.tokenStacking.getGiftExclusiveAvantage({from: beneficiary2})).equal(true);
      expect(await this.tokenStacking.exist({from: beneficiary2})).equal(true);
      expect(await this.tokenStacking.released({from: beneficiary2})).equal(false);

      // check that all getters return the right values for beneficiary3
      expect(await this.tokenStacking.getStacked({from: beneficiary3})).to.be.bignumber.equal(medium_amount);
      expect(await this.tokenStacking.getReleasable({from: beneficiary3})).to.be.bignumber.equal(medium_amount.add(new BN('55000'+decimals)));
      expect(await this.tokenStacking.getGiftAmount({from: beneficiary3})).to.be.bignumber.equal(new BN('55000'+decimals));
      expect(await this.tokenStacking.getGiftNoAds({from: beneficiary3})).equal(true);
      expect(await this.tokenStacking.getGiftExclusiveAvantage({from: beneficiary3})).equal(false);
      expect(await this.tokenStacking.exist({from: beneficiary3})).equal(true);
      expect(await this.tokenStacking.released({from: beneficiary3})).equal(false);

      // check that `other` are not in the stacking programme
      expect(await this.tokenStacking.exist({from: other})).equal(false);

      // try to release for `other` (which is not in the stacking program)
      await expectRevert( this.tokenStacking.release({from: other}), 'StackingBatch: stacker not exist' )
      // try to release for `beneficiary3` before the end of stacking program
      await expectRevert( this.tokenStacking.release({from: beneficiary3}), 'StackingBatch: tokens are not releasable for now' )

      // try to release for `beneficiary3` before the end of stacking program
      await time.increaseTo( (await this.tokenStacking.getUnlockDate({from: beneficiary3})).add(time.duration.seconds(0)) );
      await expectRevert( this.tokenStacking.release({from: beneficiary3}), 'StackingBatch: tokens are not releasable for now' )

      // check that the balance of `beneficiary3` is equal to 0 (because all funds was sent to to the stacking contract)
      expect(await this.token.balanceOf(beneficiary3)).to.be.bignumber.equal(ZERO_amount);

      // release for `beneficiary3` after the end of stacking program
      await time.increaseTo( (await this.tokenStacking.getUnlockDate({from: beneficiary3})).add(time.duration.seconds(1)) );
      await this.tokenStacking.release({from: beneficiary3});
      // check that the balance of `beneficiary3` is equal to amount staked + reward
      expect(await this.token.balanceOf(beneficiary3)).to.be.bignumber.equal(medium_amount.add(new BN('55000'+decimals)));

      // check that all getters return the right values for beneficiary3 (after the release be done)
      expect(await this.tokenStacking.getStacked({from: beneficiary3})).to.be.bignumber.equal(medium_amount);
      expect(await this.tokenStacking.getReleasable({from: beneficiary3})).to.be.bignumber.equal(ZERO_amount);
      expect(await this.tokenStacking.getGiftAmount({from: beneficiary3})).to.be.bignumber.equal(new BN('55000'+decimals));
      expect(await this.tokenStacking.getGiftNoAds({from: beneficiary3})).equal(true);
      expect(await this.tokenStacking.getGiftExclusiveAvantage({from: beneficiary3})).equal(false);
      expect(await this.tokenStacking.exist({from: beneficiary3})).equal(true);
      expect(await this.tokenStacking.released({from: beneficiary3})).equal(true);

      // try to release twice for `beneficiary3`  
      await expectRevert( this.tokenStacking.release({from: beneficiary3}), 'StackingBatch: stacker has already released these TOKENs' )
  });


});
});