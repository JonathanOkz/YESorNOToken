// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./lib/vesting/VestingBatch.sol";

contract YESorNOVestingBatchTeam is VestingBatch {

    uint   private constant _delayInDay  = 720;
    uint   private constant _durationInDay  = 1080;

    constructor(address token) VestingBatch(IERC20(token), _delayInDay, _durationInDay) {}
}