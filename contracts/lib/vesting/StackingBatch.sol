// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/****************************
* 
* This contract blocks for a stacking period an amount of TOKENs for a stacker.
* Each stacker via his public address can only participate once to this program.
* When he participates, a portion of the reward pool is allocated to him, until
* it is empty. When the reward pool is empty, access to the stacking program is
* no longer possible. To accept new participants, it will be necessary to add
* TOKENs to the reward pool.
*
******/

contract StackingBatch is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    event Released(address stacker, uint256 amount);
    event Joined(address stacker, uint256 amount, uint256 giftAmount, bool giftNoAds, bool giftExclusiveAvantage);
    event PoolIncreased(address user, uint256 amount, uint256 pool);

    uint256 SMALL  = 150000 * 10**18;  // 150K
    uint256 MEDIUM = 500000 * 10**18;  // 500K
    uint256 LARGE  = 1500000 * 10**18; // 1.5M

    struct Gift_t {
        uint256 amount;
        bool    noAds;
        bool    exclusiveAvantage;
    }
    struct Stacker_t {
        uint256 unlockDate;
        uint256 amount;
        Gift_t  gift;
        bool    released;
    }
    mapping(address => Stacker_t) private _map;

    uint256 private _pool;

    uint256 private immutable _delayInDay;
    IERC20  private immutable _token;

    /**
     * @notice
     * Define the TOKEN IERC20 and the delay in day for the stacking program.
     *
     * - `delayInDay` must be greater (or equal) than 0 and less than 3651.
     */
    constructor (IERC20 token, uint256 delayInDay) {
        require(delayInDay >= 0 && delayInDay <= 3650, "StackingBatch: delayInDay must be greater (or equal) than 0 and less than 3651");

        _delayInDay = delayInDay;
        _token = token;
    }
    

    /****************************
     * Getters
     ******/

    /**
     * @return the token.
     */
    function getToken() external view returns (IERC20) {
        return _getToken();
    }

    /**
     * @return the total amount of the reward pool.
     */
    function getPool() external view returns (uint256) {
        return _getPool();
    }

    /**
     * @return the stacked amount for the caller.
     */
    function getStacked() external view returns (uint256) {
        return _getStacked(msg.sender);
    }

    /**
     * @return the the gift amount and the stacked amount for the caller.
     */
    function getReleasable() external view returns (uint256) {
        return _getReleasable(msg.sender);
    }

    /**
     * @return the the gift amount for the caller.
     */
    function getGiftAmount() external view returns (uint256) {
        return _getGiftAmount(msg.sender);
    }

    /**
     * @return if the caller is eligible for the "no ads" gift.
     */
    function getGiftNoAds() external view returns (bool) {
        return _getGiftNoAds(msg.sender);
    }

    /**
     * @return if the caller is eligible for the "exclusive avantage" gift.
     */
    function getGiftExclusiveAvantage() external view returns (bool) {
        return _getGiftExclusiveAvantage(msg.sender);
    }

    /**
     * @return the date when the caller can unlock the stacked amount.
     */
    function getUnlockDate() external view returns (uint) {
        return _getUnlockDate(msg.sender);
    }

    /**
     * @return if the caller is in the stacking program.
     */
    function exist() external view returns (bool) {
        return _exist(msg.sender);
    }

    /**
     * @return if the caller has released.
     */
    function released() external view returns (bool) {
        return _released(msg.sender);
    }


    /****************************
     * Public functions
     ******/

    /**
     * @notice increase the reward pool with an `amount` of TOKEN.
     *
     * Requirements:
     *
     * - the `amount` is greater than 0.
     * - the caller must have called TOKEN.approve function before.
     */
    function increaseRewardPool(uint256 amount) external nonReentrant {
        require(amount > 0, "StackingBatch: amount must be > 0");

        _getToken().safeTransferFrom(msg.sender, address(this), amount);
        _increasePool(amount);

        emit PoolIncreased(msg.sender, amount, _getPool());
    }

    /**
     * @notice Join to the stacking program for an `amount` of TOKEN.
     *
     * Requirements:
     *
     * - the `amount` must be in one of the available programs.
     * - the `stacker` is not yet in the stacking program.
     * - the reward pool must be sufficient to accept a new `stacker`.
     * - the caller must have called TOKEN.approve function before.
     */
    function join(uint256 amount) external nonReentrant {
        require(amount == SMALL || amount == MEDIUM || amount == LARGE, "StackingBatch: amount is unsuitable");
        require(!_exist(msg.sender), "StackingBatch: stacker already exist");

        Gift_t memory gift = _generateGift(amount);
        require(_getPool() >= gift.amount, "StackingBatch: no enough tokens available for gift");

        _getToken().safeTransferFrom(msg.sender, address(this), amount);
        _append(msg.sender, block.timestamp.add(_delayInDay.mul(1 days)), amount, gift);
        
        emit Joined(msg.sender, amount, gift.amount, gift.noAds, gift.exclusiveAvantage);
    }

    /**
     * @notice Transfers the available amount of TOKEN to the caller.
     *
     * Requirements:
     *
     * - the caller is in the stacking program and has any amount of TOKEN realesable.
     */
    function release() external nonReentrant {
        require(_exist(msg.sender), "StackingBatch: stacker not exist");
        require(block.timestamp > _getUnlockDate(msg.sender), "StackingBatch: tokens are not releasable for now");
        require(!_released(msg.sender), "StackingBatch: stacker has already released these TOKENs");

        uint256 releasable = _getReleasable(msg.sender);
        require(releasable > 0, "StackingBatch: no tokens to release");

        _map[msg.sender].released = true;
        _getToken().safeTransfer(msg.sender, releasable);

        emit Released(msg.sender, releasable);
    }

    /****************************
     * Private functions
     ******/

    function _append(address stacker, uint256 unlockDate, uint256 amount, Gift_t memory gift) private {
        _map[stacker] = Stacker_t(unlockDate, amount, gift, false);
        _decreasePool(gift.amount);
    }

    function _generateGift(uint256 amount) private view returns (Gift_t memory) {
        if (amount == SMALL) {
            // 7% rewarded
            // No Ads for ever
            return Gift_t(amount.div(100).mul(7), true, false);
        } else if (amount == MEDIUM) {
            // 11% rewarded
            // No Ads for ever
            return Gift_t(amount.div(100).mul(11), true, false);
        } else if (amount == LARGE) {
            // 15% rewarded
            // No Ads for ever
            // 1 NFT free
            return Gift_t(amount.div(100).mul(15), true, true);
        } else {
            return Gift_t(0, false, false);
        }
    }

    function _getToken() private view returns (IERC20) {
        return _token;
    }

    function _getPool() private view returns (uint256) {
        return _pool;
    }

    function _increasePool(uint256 amount) private {
        _pool = _pool.add(amount);
    }

    function _decreasePool(uint256 amount) private {
        _pool = _pool.sub(amount);
    }

    function _exist(address stacker) private view returns (bool) {
        return _map[stacker].amount > 0;
    }

    function _released(address stacker) private view returns (bool) {
        return _map[stacker].released;
    }

    function _getReleasable(address stacker) private view returns (uint256) {
        if (!_released(stacker)) {
            return _map[stacker].amount + _map[stacker].gift.amount;
        }
        return 0;
    }

    function _getStacked(address stacker) private view returns (uint256) {
        return _map[stacker].amount;
    }

    function _getGiftAmount(address stacker) private view returns (uint256) {
        return _map[stacker].gift.amount;
    }

    function _getGiftNoAds(address stacker) private view returns (bool) {
        return _map[stacker].gift.noAds;
    }

    function _getGiftExclusiveAvantage(address stacker) private view returns (bool) {
        return _map[stacker].gift.exclusiveAvantage;
    }

    function _getUnlockDate(address stacker) private view returns (uint) {
        return _map[stacker].unlockDate;
    }
}