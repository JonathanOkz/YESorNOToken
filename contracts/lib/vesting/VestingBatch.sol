// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./release/VestingReleaseLinear.sol";
import "./../utils/modifier/OwnableOrPermissible.sol";
import "./../utils/modifier/Env.sol";

/****************************
* 
* This contract block for a vesting period an amount of YON for a beneficiaries batch.
* 
* Step 1 : The owner deploy the contract and define the climf period and the duration
* of release (by default _live is set to false => contract is in dev mode).
* 
* Step 2 : The owner add each beneficiary whith `appendBeneficiary` function. In case of
* errors, he can call `removeBeneficiary` function (only in dev mode). He can check the
* global correctness with `debug__getVested` and `debug__getTotalVested` before going in
* live mode.
* 
* Step 3 : The owner transfer the right amount of YON to the contract and call `live`
* function. Now the contract is in live mode and the vesting is starts !
******/

contract VestingBatch is VestingReleaseLinear, Ownable, OwnableOrPermissible, Env, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    event Released(address indexed beneficiary, uint256 amount);

    struct Beneficiary {
        bool    initialized;
        uint256 vested;
        uint256 released;
    }

    uint256                         private _totalVested;
    uint256                         private _totalReleased;
    mapping(address => Beneficiary) private _map;

    IERC20 private immutable _token;

    constructor (IERC20 token, uint delayInDay, uint durationInDay) VestingReleaseLinear(delayInDay, durationInDay) {
        _token = token;
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
     * @return the total balance of the contract.
     */
    function getTotalVested() external view onlyLive returns (uint256) {
        return _getTotalVested();
    }

    /**
     * @return the total amount released by the contract.
     */
    function getTotalReleased() external view onlyLive returns (uint256) {
        return _getTotalReleased();
    }

    /**
     * @return the total amount available for release.
     */
    function getTotalReleasable() external view onlyLive returns (uint256) {
        return _getTotalReleasable();
    }

    /**
     * @return the total amount locked by the contract.
     */
    function getTotalLocked() external view onlyLive returns (uint256) {
        return _getTotalLocked();
    }

    /**
     * @return the amount vested for a beneficiary.
     */
    function getVested(address beneficiary) external view onlyLive returns (uint256) {
        return _getVested(beneficiary);
    }

    /**
     * @return the released amount by beneficiary.
     */
    function getReleased(address beneficiary) external view onlyLive returns (uint256) {
        return _getReleased(beneficiary);
    }

    /**
     * @return the amount available for release by a beneficiary.
     */
    function getReleasable(address beneficiary) external view onlyLive returns (uint256) {
        return _getReleasable(beneficiary);
    }

    /**
     * @return the amount locked for a beneficiary.
     */
    function getLocked(address beneficiary) external view onlyLive returns (uint256) {
        return _getLocked(beneficiary);
    }


    /****************************
     * Public functions
     ******/

    /**
     * @notice Transfers the available amount of YON to a beneficiary.
     */
    function release() external nonReentrant onlyLive {
        uint256 releasable = _release(msg.sender);
        _token.safeTransfer(msg.sender, releasable);
        require(_getTotalVested() == _token.balanceOf(address(this)), "VestingBatch: the amount of YON transferred to the beneficiary is incorrect");

        emit Released(msg.sender, releasable);
    }


    /****************************
     * Owner public functions
     ******/

    /**
     * @notice Add beneficiary.
     */
    function appendBeneficiary(address beneficiary, uint256 amount) external nonReentrant onlyDev onlyOwner {
        require(_append(beneficiary, amount), "VestingBatch: append beneficiary was failed");
    }

    /**
     * @notice Remove beneficiary to the contract.
     */
    function removeBeneficiary(address beneficiary) external nonReentrant onlyDev onlyOwner {
        require(_remove(beneficiary), "VestingBatch: remove beneficiary was failed");
    }

    /**
     * @notice Activate the contract for real use => live mode.
     */
    function setTolive() external nonReentrant onlyDev onlyOwner {
        require(_getTotalVested() == _token.balanceOf(address(this)), "VestingBatch: the amount of YON held by the contract is incorrect");
        _setTolive();
    }

    /**
     * @notice debug function for get the amount vested for a beneficiary before live mode.
     */
    function debug__getVested(address beneficiary) external view onlyOwner returns (uint256) {
        return _getVested(beneficiary);
    }

    /**
     * @notice debug function for get the total amount vested before live mode.
     */
    function debug__getTotalVested() external view onlyOwner returns (uint256) {
        return _getTotalVested();
    }


    /****************************
     * Private functions
     ******/

    function _append(address beneficiary, uint256 amount) private returns (bool) {
        if (beneficiary != address(0) && amount > 0 && !_exist(beneficiary)) {
            _map[beneficiary] = Beneficiary(true, amount, 0);
            _increaseTotalVested(amount);
            return true;
        }
        return false;
    }

    function _remove(address beneficiary) private returns (bool) {
        if (beneficiary != address(0) && _exist(beneficiary)) {
            _decreaseTotalVested(_getVested(beneficiary));
            delete _map[beneficiary];
            return true;
        }
        return false;
    }

    function _release(address beneficiary) private returns (uint256) {
        require(_exist(beneficiary), "VestingBatch: beneficiary not exist");

        uint256 releasable = _getReleasable(beneficiary);
        require(releasable > 0, "VestingBatch: no tokens to release");

        _decreaseTotalVested(releasable);
        _decreaseVested(beneficiary, releasable);

        _increaseTotalReleased(releasable);
        _increaseReleased(beneficiary, releasable);

        return releasable;
    }

    function _exist(address beneficiary) private view returns (bool) {
        return _map[beneficiary].initialized;
    }

    function _getTotalVested() private view returns (uint256) {
        return _totalVested;
    }

    function _getTotalReleased() private view returns (uint256) {
        return _totalReleased;
    }

    function _getTotalReleasable() private view returns (uint256) {
        return _calculateReleasable(_getTotalVested(), _getTotalReleased());
    }

    function _getTotalLocked() private view returns (uint256) {
        return _getTotalVested() - _getTotalReleasable();
    }

    function _getVested(address beneficiary) private view returns (uint256) {
        return _map[beneficiary].vested;
    }

    function _getReleased(address beneficiary) private view returns (uint256) {
        return _map[beneficiary].released;
    }

    function _getReleasable(address beneficiary) private view returns (uint256) {
        return _calculateReleasable(_getVested(beneficiary), _getReleased(beneficiary));
    }

    function _getLocked(address beneficiary) private view returns (uint256) {
        return _getVested(beneficiary) - _getReleasable(beneficiary);
    }

    function _increaseTotalReleased(uint256 amount) private {
        _totalReleased = _totalReleased.add(amount);
    }

    function _increaseTotalVested(uint256 amount) private {
        _totalVested = _totalVested.add(amount);
    }

    function _decreaseTotalVested(uint256 amount) private {
        _totalVested = _totalVested.sub(amount);
    }

    function _decreaseVested(address beneficiary, uint256 amount) private {
        _map[beneficiary].vested = _map[beneficiary].vested.sub(amount);
    }

    function _increaseReleased(address beneficiary, uint256 amount) private {
        _map[beneficiary].released = _map[beneficiary].released.add(amount);
    }
}