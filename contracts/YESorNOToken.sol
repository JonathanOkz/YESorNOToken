// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./lib/Token.sol";

contract YESorNOToken is Token {

    string  private constant _name   = "YESorNO";
    string  private constant _symbol = "YON";
    uint256 private constant _cap    = 9000000000 * 10**18;

    constructor(address gnosis) Token(gnosis, _name, _symbol, _cap) {}
}