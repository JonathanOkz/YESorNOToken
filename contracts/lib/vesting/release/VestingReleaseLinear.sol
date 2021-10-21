// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/****************************
* 
* This is a simple implementation of linear release for vesting contracts.
******/

contract VestingReleaseLinear {
    using SafeMath for uint256;

    uint private constant SECOND = 1;
    uint private constant MINUTE = 60 * SECOND;
    uint private constant HOUR   = 60 * MINUTE;
    uint private constant DAY    = 24 * HOUR;

    uint private immutable _start;
    uint private immutable _duration;

    constructor (uint delayInDay, uint durationInDay) {
        require(delayInDay >= 0 && delayInDay <= 3650,      "VestingReleaseLinear: delayInDay must be greater (or equal) than 0 and less than 3651");
        require(durationInDay >= 0 && durationInDay <= 3650, "VestingReleaseLinear: durationInDay must be greater (or equal) than 0 and less than 3651");

        _start = block.timestamp.add(delayInDay.mul(DAY));
        _duration = durationInDay.mul(DAY);
    }

    /**
     * @return the start time of the vesting.
     */
    function getStart() public view returns (uint) {
        return _start;
    }

    /**
     * @return the duration of the vesting.
     */
    function getDuration() public view returns (uint) {
        return _duration;
    }

    /**
     * @return Calculate the right amount available for release.
     */
    function _calculateReleasable(uint256 vested, uint256 released) internal view returns (uint256) {
        if (vested == 0) {
            return 0;
        }
        if (block.timestamp <= _start) {
            return 0;
        } else if (_duration > 0 && block.timestamp <= _start.add(_duration)) {
            return _calculateLinearAmountReleasable(vested, released);
        } else {
            return vested;
        }
    }

    /**
     * @return Calculate the linear amount releasable.
     */
    function _calculateLinearAmountReleasable(uint256 vested, uint256 released) private view returns (uint256) {
        require(_duration > 0, "VestingReleaseLinear: _duration must be greater than 0");
        uint256 total = vested.add(released);
        uint256 totalReleasable = total.mul(block.timestamp.sub(_start)).div(_duration);
        uint256 releasable = totalReleasable.sub(released);
        return releasable;
    }
}
