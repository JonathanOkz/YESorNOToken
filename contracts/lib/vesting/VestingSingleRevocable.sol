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
     * @notice Stop the acquisition program for the beneficiary
     * (for example if an employee resigns before the end of the acquisition period).
     * The tokens already acquired remain accessible to the beneficiary with the
     * function release(). The tokens not yet acquired are burn.
     *
     * Requirements:
     *
     * - the caller is the owner.
     * - the contract is not yet revoked.
     * - the amount of TOKEN locked is greater than 0.
     */
    function revoke() external nonReentrant onlyOwner {
        require(_revoked != true, "VestingSingleRevocable: is already revoked");

        uint256 locked = getLocked();

        require(locked > 0, "VestingSingleRevocable: no tokens to burn");

        (bool success,) = address(_token).call(abi.encodeWithSignature("burn(uint256)", locked));
        require(success);

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