// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./lib/vesting/VestingBatch.sol";

contract YESorNOVestingBatchTeam is VestingBatch {

    uint   private constant _delayInDay  = 360;
    uint   private constant _durationInDay  = 1440;

    constructor(address token, address gnosis) VestingBatch(IERC20(token), _delayInDay, _durationInDay, msg.sender, gnosis) {}
}