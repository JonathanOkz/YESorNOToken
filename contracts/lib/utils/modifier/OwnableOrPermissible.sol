// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract OwnableOrPermissible is Ownable {

    /**
     * @notice Check if the caller of function is either the owner of contract or the permitted address.
     */
    modifier onlyOwnerOrPermitted(address permitted) {
        require(msg.sender == owner() || msg.sender == permitted, "OwnableOrPermissible: caller is not the authorized");
        _;
    }

    /**
     * @notice Check if the caller of function is the permitted address.
     */
    modifier onlyPermitted(address permitted) {
        require(msg.sender == permitted, "OwnableOrPermissible: caller is not the authorized");
        _;
    }
}
