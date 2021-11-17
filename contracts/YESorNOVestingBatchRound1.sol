// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./lib/vesting/VestingBatch.sol";

contract YESorNOVestingBatchRound1 is VestingBatch {

    uint   private constant _delayInDay  = 180;
    uint   private constant _durationInDay  = 300;

    constructor(address token, address gnosis) VestingBatch(IERC20(token), _delayInDay, _durationInDay, msg.sender, gnosis) {}
}