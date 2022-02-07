const { BN, constants, expectRevert, time } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const YESorNOToken = artifacts.require('YESorNOToken');
const VestingBatch = artifacts.require('VestingBatch');

function timeout(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, time);
  });  
}

// faire un test avec delay et duration à 0 !!!!!

contract('VestingBatch big supply', function (accounts) {
  const [ owner, beneficiary1, beneficiary2, beneficiary3, beneficiary4, beneficiary5, initiator, activator, other ] = accounts;

  const name = 'YESorNO';
  const symbol = 'YON';

  const amount1 = new BN('1000000000');
  const amount1b = new BN('10000000005');
  const amount2 = new BN('21000000000');
  const amount3 = new BN('1400000000');
  const amount4 = new BN('1200000');
  const amount5 = new BN('3000000000');
  const amount_total = amount1b.add(amount2).add(amount4).add(amount5);
  const ZERO_amount = new BN(0)
  const INITIATOR_ROLE = web3.utils.soliditySha3('INITIATOR_ROLE');
  const ACTIVATOR_ROLE = web3.utils.soliditySha3('ACTIVATOR_ROLE');

  context('with token', function () {
    const DAY = new BN(86400);
      const delay = new BN(90);
      const duration = new BN(300);
      let tokenVesting_start = 0;
      
      

    beforeEach(async function () {
      this.now = await time.latest();
      this.token = await YESorNOToken.new(activator);
    });

    beforeEach(async function () {
      this.tokenVesting = await VestingBatch.new(this.token.address, delay, duration, initiator, activator, {from: owner}),
      tokenVesting_start = await this.tokenVesting.getStart();

      
      console.log( "tokenVesting getToken():", await this.tokenVesting.getToken(), "| token address:", this.token.address );
      expect(await this.tokenVesting.getToken()).to.equal(this.token.address);
      
      // await this.token.mint(this.tokenVesting.address, amount, {from: owner});
    });

    it('VestingBatch tests', async function () {

      expect(await this.tokenVesting.getStart({from: other}))
      expect(await this.tokenVesting.getDuration({from: other}))

      console.log("getStart:", (await this.tokenVesting.getStart({from: other})).toString() );
      console.log("getDuration:", (await this.tokenVesting.getDuration({from: other})).toString() );

      // try to add beneficiaries to the contract
      await expectRevert(this.tokenVesting.appendBeneficiary(beneficiary1, amount1, {from: activator}), 'VestingBatch: the caller is not authorized');
      await expectRevert(this.tokenVesting.appendBeneficiary(beneficiary1, amount1, {from: beneficiary1}), 'VestingBatch: the caller is not authorized');
      await expectRevert(this.tokenVesting.appendBeneficiary(beneficiary1, amount1, {from: other}), 'VestingBatch: the caller is not authorized');

      // add beneficiaries to the contract
      await this.tokenVesting.appendBeneficiary(beneficiary1, amount1, {from: initiator})
      await this.tokenVesting.appendBeneficiary(beneficiary2, amount2, {from: initiator})
      await this.tokenVesting.appendBeneficiary(beneficiary3, amount3, {from: initiator})
      await this.tokenVesting.appendBeneficiary(beneficiary4, amount4, {from: initiator})
      await this.tokenVesting.appendBeneficiary(beneficiary5, amount5, {from: initiator})
      
      // try to add beneficiary5 (already added)
      await expectRevert(this.tokenVesting.appendBeneficiary(beneficiary5, amount3, {from: initiator}), 'VestingBatch: append beneficiary failed');

      // try to remove beneficiaries to the contract
      await expectRevert(this.tokenVesting.removeBeneficiary(beneficiary1, {from: activator}), 'VestingBatch: the caller is not authorized');
      await expectRevert(this.tokenVesting.removeBeneficiary(beneficiary1, {from: beneficiary1}), 'VestingBatch: the caller is not authorized');
      await expectRevert(this.tokenVesting.removeBeneficiary(beneficiary1, {from: other}), 'VestingBatch: the caller is not authorized');

      // remove beneficiary1
      await this.tokenVesting.removeBeneficiary(beneficiary1, {from: initiator})
      // try to remove beneficiary1 (already removed)
      await expectRevert(this.tokenVesting.removeBeneficiary(beneficiary1, {from: initiator}), 'VestingBatch: remove beneficiary failed');
      // check if beneficiary1 is really removed
      expect(await this.tokenVesting.debug__getVested(beneficiary1, {from: initiator})).to.be.bignumber.equal(ZERO_amount);
     
      // add beneficiary1 to the contract with another amount
      await this.tokenVesting.appendBeneficiary(beneficiary1, amount1b, {from: initiator})

      // remove beneficiary3
      await this.tokenVesting.removeBeneficiary(beneficiary3, {from: initiator})

      // check if the amount of all beneficiaries is OK
      expect(await this.tokenVesting.debug__getVested(beneficiary1, {from: initiator})).to.be.bignumber.equal(amount1b);
      expect(await this.tokenVesting.debug__getVested(beneficiary2, {from: initiator})).to.be.bignumber.equal(amount2);
      expect(await this.tokenVesting.debug__getVested(beneficiary3, {from: initiator})).to.be.bignumber.equal(ZERO_amount);
      expect(await this.tokenVesting.debug__getVested(beneficiary4, {from: activator})).to.be.bignumber.equal(amount4);
      expect(await this.tokenVesting.debug__getVested(beneficiary5, {from: activator})).to.be.bignumber.equal(amount5);

      // try to remove beneficiaries to the contract
      await expectRevert(this.tokenVesting.debug__getVested(beneficiary5, {from: beneficiary5}), 'VestingBatch: the caller is not authorized');
      await expectRevert(this.tokenVesting.debug__getTotalVested({from: beneficiary5}), 'VestingBatch: the caller is not authorized');

      // check _totalVested is OK
      expect(await this.tokenVesting.debug__getTotalVested({from: initiator})).to.be.bignumber.equal(amount_total);
      expect(await this.tokenVesting.debug__getTotalVested({from: activator})).to.be.bignumber.equal(amount_total);

      // try to activate the prod mode before initiator renounceRole
      await expectRevert(this.tokenVesting.setTolive({from: activator}), 'VestingBatch: before activate the contract all INITIATOR_ROLE must be revoked');

      // initiator renounceRole
      await this.tokenVesting.renounceRole(INITIATOR_ROLE, initiator, {from: initiator});

      // try to activate the prod mode
      await expectRevert(this.tokenVesting.setTolive({from: beneficiary5}), 'VestingBatch: the caller is not authorized');
      await expectRevert(this.tokenVesting.setTolive({from: initiator}), 'VestingBatch: the caller is not authorized');
      
      // check if contract is in dev mode
      expect(await this.tokenVesting.isLive({from: other})).equal( false );

      // try to access at onlyLive function in dev mode
      await expectRevert(this.tokenVesting.getTotalVested({from: other}), 'Env: contract must be in live mode');

      // try to activate the prod mode before sending YON to the contract
      await expectRevert(this.tokenVesting.setTolive({from: activator}), 'VestingBatch: the amount of TOKEN held by the contract is incorrect');
      // check if contract is in dev mode
      expect(await this.tokenVesting.isLive({from: other})).equal( false );

      // send YON to the contract
      await this.token.mint(this.tokenVesting.address, amount_total, {from: activator});

      // activate the live mode
      await this.tokenVesting.setTolive({from: activator})

      // check if contract is in live mode
      expect(await this.tokenVesting.isLive({from: other})).equal( true );

      // try to access at onlyLive function in dev mode AND check _totalVested is OK
      expect(await this.tokenVesting.getTotalVested()).to.be.bignumber.equal(amount_total);

      // 1 second before
      await time.increaseTo( tokenVesting_start.sub(time.duration.seconds(1)) );
      expect(await this.tokenVesting.getTotalReleasable()).to.be.bignumber.equal(ZERO_amount);
      console.log("getTotalReleasable (1 second before):", (await this.tokenVesting.getTotalReleasable()).toString() );
      expect(await this.tokenVesting.getReleasable(beneficiary1)).to.be.bignumber.equal(ZERO_amount);
      console.log("getReleasable (1 second before):", (await this.tokenVesting.getReleasable(beneficiary1)).toString() );

      // on time
      await time.increaseTo( tokenVesting_start );
      expect(await this.tokenVesting.getTotalReleasable()).to.be.bignumber.equal(ZERO_amount);
      console.log("getTotalReleasable (on time):", (await this.tokenVesting.getTotalReleasable()).toString() );
      expect(await this.tokenVesting.getReleasable(beneficiary1)).to.be.bignumber.equal(ZERO_amount);
      console.log("getReleasable (on time):", (await this.tokenVesting.getReleasable(beneficiary1)).toString() );

      // 1 second after
      await time.increaseTo( tokenVesting_start.add(time.duration.seconds(1)) );
      expect(await this.tokenVesting.getTotalReleasable()).to.be.bignumber.gt(ZERO_amount);
      console.log("getTotalReleasable (1 second after):", (await this.tokenVesting.getTotalReleasable()).toString() );
      expect(await this.tokenVesting.getReleasable(beneficiary1)).to.be.bignumber.gt(ZERO_amount);
      console.log("getReleasable (1 second after):", (await this.tokenVesting.getReleasable(beneficiary1)).toString() );



      let sum = new BN(0);
      const tokenVesting = this.tokenVesting;
      const token = this.token;

      totalReleased = await tokenVesting.getTotalReleased();
      totalVested = await tokenVesting.getTotalVested();

      const releaseRecursive = async function(i) {
        if (sum.gte(amount4)) {
          return
        }
        await time.increaseTo( tokenVesting_start.add(time.duration.seconds(1 * i)) );

        const totalVestedBefore = await tokenVesting.getTotalVested();

        const response = await tokenVesting.release({from: beneficiary4});
        const released = response.logs[0].args['1']
  
        expect(await tokenVesting.getTotalVested()).to.be.bignumber.equal( totalVestedBefore.sub(released) );
  
        sum = await token.balanceOf(beneficiary4)
        console.log("=>", Math.round(i/86400), "days:",  (sum).toString() )

        expect(await tokenVesting.getReleased(beneficiary4)).to.be.bignumber.equal( sum );
        expect(await tokenVesting.getReleasable(beneficiary4)).to.be.bignumber.equal( ZERO_amount );
        expect(await tokenVesting.getLocked(beneficiary4)).to.be.bignumber.equal( amount4.sub(sum) );
        expect(await tokenVesting.getVested(beneficiary4)).to.be.bignumber.equal( amount4.sub(sum) );

        expect(await tokenVesting.getTotalReleased()).to.be.bignumber.equal( totalReleased.add(sum) );
        expect(await tokenVesting.getTotalVested()).to.be.bignumber.equal( totalVested.sub(sum) );

        return releaseRecursive(i += (Math.random()*86400*10) )
      }
      await releaseRecursive(400)


      expect(await this.token.balanceOf(beneficiary4)).to.be.bignumber.equal(amount4);

      expect(await this.tokenVesting.getReleased(beneficiary4)).to.be.bignumber.equal( amount4 );
      expect(await this.tokenVesting.getReleasable(beneficiary4)).to.be.bignumber.equal( ZERO_amount );
      expect(await this.tokenVesting.getLocked(beneficiary4)).to.be.bignumber.equal( ZERO_amount );
      expect(await this.tokenVesting.getVested(beneficiary4)).to.be.bignumber.equal( ZERO_amount );

      expect(await tokenVesting.getTotalReleased()).to.be.bignumber.equal( totalReleased.add(amount4) );
      expect(await tokenVesting.getTotalVested()).to.be.bignumber.equal( totalVested.sub(amount4) );

      await expectRevert(this.tokenVesting.release({from: beneficiary4}), 'VestingBatch: no tokens to release');

    });


});
});

// contract('VestingBatch', function (accounts) {
//   const [ owner, beneficiary ] = accounts;

//   const name = 'YESorNO';
//   const symbol = 'YON';

//   const amount = new BN('10000');
//   const ZERO_amount = new BN(0)

//   context('with token', function () {
//     beforeEach(async function () {
//       this.now = await time.latest();
//       this.token = await YESorNOToken.new(owner);
//     });

//     it('rejects a release time in the past', async function () {

//       await expectRevert(
//         VestingBatch.new(this.token.address, ZERO_ADDRESS, 10, 30, {from: owner}),
//         'VestingBatch: beneficiary is the zero address',
//       );

//       await expectRevert(
//         VestingBatch.new(this.token.address, beneficiary, -1, 30, {from: owner}),
//         'value out-of-bounds (argument="delayInDay", value=-1, code=INVALID_ARGUMENT, version=abi/5.0.7)',
//       );
//       await expectRevert(
//         VestingBatch.new(this.token.address, beneficiary, 3651, 30, {from: owner}),
//         'VestingReleaseLinear: delayInDay must be greater (or equal) than 0 and less than 3651',
//       );

//       await expectRevert(
//         VestingBatch.new(this.token.address, beneficiary, 10, 0, {from: owner}),
//         'VestingReleaseLinear: durationInDay must be greater (or equal) than 0 and less than 3651',
//       );
//       await expectRevert(
//         VestingBatch.new(this.token.address, beneficiary, 10, 3651, {from: owner}),
//         'VestingReleaseLinear: durationInDay must be greater (or equal) than 0 and less than 3651',
//       );
//     });

//     context('once deployed', function () {
//       const DAY = new BN(86400);
//       const delay = new BN(365);
//       const duration = new BN(150);
//       let tokenVesting_start = 0;
//       beforeEach(async function () {
//         this.tokenVesting = await VestingBatch.new(this.token.address, beneficiary, delay, duration, {from: owner}),
//         tokenVesting_start = await this.tokenVesting.getStart();
//         await this.token.mint(this.tokenVesting.address, amount, {from: owner});
//       });

//       it('can get state', async function () {
//         expect(await this.tokenVesting.getDuration()).to.be.bignumber.equal(duration.mul(new BN(DAY)));
//       });

//       it('cannot be released before time limit', async function () {
//         await expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingBatch: no tokens to release');
//         expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal(ZERO_amount);
//         expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal(ZERO_amount);
//         expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal(amount);
//         expect(await this.tokenVesting.getVested()).to.be.bignumber.equal(amount);
//       });

//       it('cannot be released just before time limit', async function () {
//         await time.increaseTo( tokenVesting_start );
//         await expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingBatch: no tokens to release');
//         expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal(ZERO_amount);
//       });

//       it('get releasable amount function of time', async function () {
//         // 2 day after
//         await time.increaseTo( tokenVesting_start.add(time.duration.days(2)) );
//         expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal(new BN(133));

//         // on delay
//         await time.increaseTo( tokenVesting_start.add(time.duration.days(duration)) );
//         expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal(amount);

//         // 2 day after delay
//         await time.increaseTo( tokenVesting_start.add(time.duration.days(duration)).add(time.duration.days(2)) );
//         expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal(amount);
//       });

//       it('can be released just after limit', async function () {
//         // release 1 second after start date
//         const value = new BN(66);
//         await time.increaseTo( tokenVesting_start.add(time.duration.days(1)) );

//         expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( ZERO_amount );
//         expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( value );
//         expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( amount.sub(value) );
//         expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( amount );

//         await this.tokenVesting.release({from: beneficiary});
//         expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal(value);

//         expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( value );
//         expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( ZERO_amount );
//         expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( amount.sub(value) );
//         expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( amount.sub(value) );

//         // release 500 days after start date
//         await time.increaseTo( tokenVesting_start.add(time.duration.days(500)) );

//         expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( value );
//         expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( amount.sub(value) );
//         expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( ZERO_amount );
//         expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( amount.sub(value) );

//         await this.tokenVesting.release({from: beneficiary});
//         expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal(amount);

//         expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( amount );
//         expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( ZERO_amount );
//         expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( ZERO_amount );
//         expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( ZERO_amount );

//         await expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingBatch: no tokens to release');
//       });

//       it('can be released total amount after delay time', async function () {
//         await time.increaseTo( tokenVesting_start.add(time.duration.days(500)) );

//         expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( ZERO_amount );
//         expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( amount );
//         expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( ZERO_amount );
//         expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( amount );

//         await this.tokenVesting.release({from: beneficiary});
//         expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal(amount);

//         expect(await this.tokenVesting.getReleased()).to.be.bignumber.equal( amount );
//         expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( ZERO_amount );
//         expect(await this.tokenVesting.getLocked()).to.be.bignumber.equal( ZERO_amount );
//         expect(await this.tokenVesting.getVested()).to.be.bignumber.equal( ZERO_amount );

//         await expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingBatch: no tokens to release');
//       });

//       it('cannot be released twice', async function () {
//         await time.increaseTo( tokenVesting_start.add(time.duration.days(50)) );

//         expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal( ZERO_amount );
//         expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( new BN(3333) );

//         await Promise.all([
//           this.tokenVesting.release({from: beneficiary}),
//           expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingBatch: no tokens to release'),
//           expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingBatch: no tokens to release'),
//           expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingBatch: no tokens to release'),
//           expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingBatch: no tokens to release'),
//           expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingBatch: no tokens to release'),
//           expectRevert(this.tokenVesting.release({from: beneficiary}), 'VestingBatch: no tokens to release'),
//         ])

//         expect(await this.token.balanceOf(beneficiary)).to.be.bignumber.equal( new BN(3333) );
//         expect(await this.tokenVesting.getReleasable()).to.be.bignumber.equal( ZERO_amount );

//       });


//     });


//   });
// });
