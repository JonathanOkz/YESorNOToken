// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./lib/vesting/VestingBatch.sol";

contract YESorNOVestingBatchAdvisor is VestingBatch {

    uint   private constant _delayInDay  = 360;
    uint   private constant _durationInDay  = 360;

    constructor(address token) VestingBatch(IERC20(token), _delayInDay, _durationInDay) {}
}