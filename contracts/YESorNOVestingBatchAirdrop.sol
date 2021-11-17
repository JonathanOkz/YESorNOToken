// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./lib/vesting/VestingBatch.sol";

contract YESorNOVestingBatchAirdrop is VestingBatch {

    uint   private constant _delayInDay  = 90;
    uint   private constant _durationInDay  = 360;

    constructor(address token, address gnosis) VestingBatch(IERC20(token), _delayInDay, _durationInDay, msg.sender, gnosis) {}
}