// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Env {
    bool private _live;

    /**
     * @return if the contract is live.
     */
    function isLive() public view returns (bool) {
        return _live;
    }

    /**
     * @notice Check if the contract is in live mode, several functions are restricted and run only in live mode for securities raisons.
     */
    modifier onlyLive() {
        require(_live == true, "Env: contract must be in live mode");
        _;
    }

    /**
     * @notice Check if the contract is in dev mode, several functions are restricted and run only in dev mode for securities raisons.
     */
    modifier onlyDev() {
        require(_live == false, "Env: contract must be in dev mode");
        _;
    }

    function _setTolive() internal onlyDev {
        _live = true;
    }
}
