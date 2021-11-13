// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./release/VestingReleaseLinear.sol";
import "./../utils/modifier/Env.sol";

/****************************
* 
* This contract block for a vesting period an amount of TOKEN for a beneficiaries batch.
* The `initiator` can set the list of beneficiaries and the `activator` can activate the
* contract (live mode) only after that the `initiator` has renounced to his role.
* 
* Step 1 : The caller deploy the the contract with a climf and duration period in day.
* He define an `initiator` and `activator` account for the contratct management.
* 
* Step 2 : The `initiator` add each beneficiary whith appendBeneficiary() function. In case
* of errors, he can call removeBeneficiary() function. He can check the global correctness
* with debug__getVested() and debug__getTotalVested(). When it's done, he call renounceRole()
* to freeze the beneficiaries list.
* 
* 
* Step 3 : The `activator` can check the global correctness with debug__getVested() and 
* debug__getTotalVested(). If the beneficiaries list is good and the contract has
* receiving the correct amount of TOKEN. The `activator` can call live() function.
* 
******/

contract VestingBatch is VestingReleaseLinear, Env, ReentrancyGuard, AccessControlEnumerable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    bytes32 public constant INITIATOR_ROLE = keccak256("INITIATOR_ROLE");
    bytes32 public constant ACTIVATOR_ROLE = keccak256("ACTIVATOR_ROLE");

    event Released(address indexed beneficiary, uint256 amount);
    event Live();

    struct Beneficiary {
        bool    initialized;
        uint256 vested;
        uint256 released;
    }

    uint256                         private _totalVested;
    uint256                         private _totalReleased;
    mapping(address => Beneficiary) private _map;

    IERC20 private immutable _token;

    /**
     * @notice
     * Grants `INITIATOR_ROLE` to the account `initiator`.
     * Grants `ACTIVATOR_ROLE` to the account `activator`.
     * Define the TOKEN IERC20 interface for the vesting program.
     */
    constructor (IERC20 token, uint delayInDay, uint durationInDay, address initiator, address activator) VestingReleaseLinear(delayInDay, durationInDay) {
        _setupRole(INITIATOR_ROLE, initiator);
        _setupRole(ACTIVATOR_ROLE, activator);
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
     * @notice Transfers the available amount of TOKEN to the caller.
     *
     * Requirements:
     *
     * - the contact is in live mode.
     * - the caller is in the vesting program and has any amount of TOKEN realesable.
     */
    function release() external nonReentrant onlyLive {
        uint256 releasable = _release(_msgSender());
        _token.safeTransfer(_msgSender(), releasable);
        emit Released(_msgSender(), releasable);
    }


    /****************************
     * Restricted public functions
     ******/

    /**
     * @notice Add `beneficiary` to the vesting program for an `amount` of TOKEN.
     *
     * Requirements:
     *
     * - the contact is in dev mode.
     * - the caller must have the `INITIATOR_ROLE`.
     * - the `beneficiary` is not yet in the vesting program.
     * - the `amount` is greater than 0.
     */
    function appendBeneficiary(address beneficiary, uint256 amount) external nonReentrant onlyDev {
        require(hasRole(INITIATOR_ROLE, _msgSender()), "VestingBatch: the caller is not authorized");
        require(_append(beneficiary, amount),          "VestingBatch: append beneficiary failed");
    }

    /**
     * @notice Remove `beneficiary` to the vesting program.
     *
     * Requirements:
     *
     * - the contact is in dev mode.
     * - the caller must have the `INITIATOR_ROLE`.
     * - the `beneficiary` is in the vesting program.
     */
    function removeBeneficiary(address beneficiary) external nonReentrant onlyDev {
        require(hasRole(INITIATOR_ROLE, _msgSender()), "VestingBatch: the caller is not authorized");
        require(_remove(beneficiary),                  "VestingBatch: remove beneficiary failed");
    }

    /**
     * @notice Activate the contract for real use => live mode.
     *
     * Requirements:
     *
     * - the contact is in dev mode.
     * - all `INITIATOR_ROLE` are revoked.
     * - the caller must have the `ACTIVATOR_ROLE`.
     * - the contract holds the right amount of TOKEN.
     */
    function setTolive() external nonReentrant onlyDev {
        require(getRoleMemberCount(INITIATOR_ROLE) == 0,              "VestingBatch: before activate the contract all INITIATOR_ROLE must be revoked");
        require(hasRole(ACTIVATOR_ROLE, _msgSender()),                "VestingBatch: the caller is not authorized");
        require(_token.balanceOf(address(this)) >= _getTotalVested(), "VestingBatch: the amount of TOKEN held by the contract is incorrect");
        _setTolive();
        emit Live();
    }

    /**
     * @notice [debug function] Get the amount vested for a beneficiary.
     *
     * Requirements:
     *
     * - the caller must have the `INITIATOR_ROLE` or `ACTIVATOR_ROLE`.
     */
    function debug__getVested(address beneficiary) external view returns (uint256) {
        require(hasRole(INITIATOR_ROLE, _msgSender()) || hasRole(ACTIVATOR_ROLE, _msgSender()), "VestingBatch: the caller is not authorized");
        return _getVested(beneficiary);
    }

    /**
     * @notice [debug function] Get the total amount vested.
     *
     * Requirements:
     *
     * - the caller must have the `INITIATOR_ROLE` or `ACTIVATOR_ROLE`.
     */
    function debug__getTotalVested() external view returns (uint256) {
        require(hasRole(INITIATOR_ROLE, _msgSender()) || hasRole(ACTIVATOR_ROLE, _msgSender()), "VestingBatch: the caller is not authorized");
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