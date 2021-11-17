// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./lib/vesting/VestingBatch.sol";

contract YESorNOVestingBatchRound3 is VestingBatch {

    uint   private constant _delayInDay  = 180+16;
    uint   private constant _durationInDay  = 0;

    constructor(address token, address gnosis) VestingBatch(IERC20(token), _delayInDay, _durationInDay, msg.sender, gnosis) {}
}