// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./VestingSingle.sol";

/****************************
* 
* Tis contract allows the owner to revoke the vesting. Tokens already vested
* remains available for the beneficiary, the rest are transferred to owner.
 
* For example: This contract can be used for an employee. It can be revoked
* by the owner if the employee resigns before the end of the acquisition period.
******/

contract VestingSingleRevocable is VestingSingle {
    using SafeERC20 for IERC20;

    event Revoked();

    bool private _revoked;

    constructor (IERC20 token, address beneficiary, uint delayInDay, uint durationInDay) VestingSingle(token, beneficiary, delayInDay, durationInDay) {}

    /****************************
     * Getters
     ******/

    /**
     * @return the released amount.
     */
    function getRevoked() external view returns (bool) {
        return _revoked;
    }

    /****************************
     * Public functions
     ******/

    /**
     * @notice This function can stop the acquisition of tokens for the beneficiary
     * (for example if an employee resigns before the end of the acquisition period).
     * The tokens already acquired remain accessible to the beneficiary with the
     * function release(). The tokens not yet acquired are transferred to owner.
     */
    function revoke() external nonReentrant onlyOwner {
        require(_revoked != true, "VestingSingleRevocable: is already revoked");

        uint256 vested = getVested();
        uint256 releasable = getReleasable();
        uint256 excess = vested - releasable;

        require(excess > 0, "VestingSingleRevocable: no tokens to send");

        _token.safeTransfer(owner(), excess);

        _revoked = true;

        emit Revoked();
    }

    /**
     * @return the amount available for release.
     */
    function getReleasable() public view override returns (uint256) {
        if (_revoked == true)  {
            return getVested();
        }
        return super.getReleasable();
    }
}