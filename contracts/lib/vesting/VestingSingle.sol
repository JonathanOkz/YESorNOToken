// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./release/VestingReleaseLinear.sol";
import "./../utils/modifier/OwnableOrPermissible.sol";

/****************************
* 
* This contract block for a vesting period an amount of YON for one beneficiary.
******/

contract VestingSingle is VestingReleaseLinear, Ownable, OwnableOrPermissible, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    event Released(uint256 amount);

    IERC20  internal immutable _token;
    address internal immutable _beneficiary;
    uint256 internal           _released;

    constructor (IERC20 token, address beneficiary, uint delayInDay, uint durationInDay) VestingReleaseLinear(delayInDay, durationInDay) {
        require(beneficiary != address(0), "VestingSingle: beneficiary is the zero address");

        _token = token;
        _beneficiary = beneficiary;
    }

    /****************************
     * Getters
     ******/

    /**
     * @return the token.
     */
    function getToken() external view returns (IERC20) {
        return _token;
    }
    
    /**
     * @return the beneficiary address.
     */
    function getBeneficiary() external view onlyOwnerOrPermitted(_beneficiary) returns (address) {
        return _beneficiary;
    }

    /**
     * @return the released amount.
     */
    function getReleased() public view returns (uint256) {
        return _released;
    }

    /**
     * @return the amount available for release.
     */
    function getReleasable() public view virtual returns (uint256) {
        return _calculateReleasable(getVested(), getReleased());        
    }

    /**
     * @return the amount locked.
     */
    function getLocked() public view returns (uint256) {
        return getVested() - getReleasable();
    }

    /**
     * @return the current balance.
     */
    function getVested() public view returns (uint256) {
        return _token.balanceOf(address(this));
    }

    /****************************
     * Public functions
     ******/

    /**
     * @notice Transfers available amount to beneficiary.
     */
    function release() external nonReentrant onlyPermitted(_beneficiary) {
        uint256 releasable = getReleasable();
        require(releasable > 0, "VestingSingle: no tokens to release");
        _released = _released.add(releasable);
        _token.safeTransfer(_beneficiary, releasable);
        emit Released(releasable);
    }
}
