// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/****************************
* 
* 
******/

contract StackingBatch is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;


    event Released(address indexed stacker, uint256 amount);
    event Joined(address indexed stacker, uint256 amount);
    event PoolIncreased(uint256 amount);

    uint256 SMALL  = 150000 * 10**18;  // 150K
    uint256 MEDIUM = 500000 * 10**18;  // 500K
    uint256 LARGE  = 1500000 * 10**18; // 1.5M

    struct Gift {
        uint256 amount;
        bool noAds;
        bool freeExclusiveBadge;
    }
    struct Stacker {
        uint    unlockDate;
        uint256 amount;
        Gift    gift;
        bool    released;
    }

    mapping(address => Stacker) private _map;
    address[] private _array;

    uint256 private _pool;

    IERC20 private immutable _token;

    uint private immutable _delayInDay;

    /**
     * @notice
     * Define the TOKEN IERC20 interface for the stacking program.
     *
     * Grants `REWARDER_ROLE` to the account `rewarder`.
     *
     * - `delayInDay` must be greater (or equal) than 0 and less than 3651.
     */
    constructor (IERC20 token, uint delayInDay) {
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
        return _token;
    }

    /**
     * @return the total amount stacked.
     */
    function getTotalStacked() external view returns (uint256) {
        return _getTotalStacked();
    }

    /**
     * @return the total amount releasable.
     */
    function getTotalReleasable() external view returns (uint256) {
        return _getTotalReleasable();
    }

    /**
     * @return the total amount released.
     */
    function getTotalReleased() external view returns (uint256) {
        return _getTotalReleased();
    }


    /**
     * @return the total amount of reward pool.
     */
    function getPool() external view returns (uint256) {
        return _getPool();
    }

    /**
     * @return return the amount stacked for a the `msg.sender`.
     */
    function getReleasable() external view returns (uint256) {
        return _getReleasable(msg.sender);
    }

    /**
     * @return return the amount stacked for a the `msg.sender`.
     */
    function getStacked() external view returns (uint256) {
        return _getStacked(msg.sender);
    }

    /**
     * @return return the amount stacked for a the `msg.sender`.
     */
    function getGiftAmount() external view returns (uint256) {
        return _getGiftAmount(msg.sender);
    }

    function getGiftNoAds() external view returns (bool) {
        return _getGiftNoAds(msg.sender);
    }

    function getGiftFreeExclusiveBadge() external view returns (bool) {
        return _getGiftFreeExclusiveBadge(msg.sender);
    }

    /**
     * @return the start date for the `msg.sender`.
     */
    function getUnlockDate() external view returns (uint) {
        return _getUnlockDate(msg.sender);
    }

    /**
     * @return if the `msg.sender` is in the stacking program.
     */
    function exist() external view returns (bool) {
        return _exist(msg.sender);
    }

    /**
     * @return if the `msg.sender` has released.
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
        _token.safeTransferFrom(msg.sender, address(this), amount);
        _increasePool(amount);
        emit PoolIncreased(_getPool());
    }

    /**
     * @notice Join to the stacking program for an `amount` of TOKEN.
     *
     * Requirements:
     *
     * - the `amount` must be in one of the available programs.
     * - the caller must have called TOKEN.approve function before.
     * - the `stacker` is not yet in the stacking program.
     * - the reward pool must be sufficient to accept a new `stacker`.
     */
    function join(uint256 amount) external nonReentrant {
        require(amount == SMALL || amount == MEDIUM || amount == LARGE, "StackingBatch: amount is unsuitable");
        _token.safeTransferFrom(msg.sender, address(this), amount);
        _append(msg.sender, amount);
        // require(_token.balanceOf(address(this)) >= _getTotalStacked() + _getPool(), "StackingBatch: no enough TOKEN available !");
        emit Joined(msg.sender, amount);
    }

    /**
     * @notice Transfers the available amount of TOKEN to the caller.
     *
     * Requirements:
     *
     * - the caller is in the stacking program and has any amount of TOKEN realesable.
     */
    function release() external nonReentrant {
        uint256 releasable = _release(msg.sender);
        _token.safeTransfer(msg.sender, releasable);
        emit Released(msg.sender, releasable);
    }

    /****************************
     * Private functions
     ******/

    function _append(address stacker, uint256 amount) private {
        require(!_exist(msg.sender), "StackingBatch: stacker already exist");
        Gift memory gift = _generateGift(amount);
        require(_getPool() >= gift.amount, "StackingBatch: no enough tokens available for gift !");
        _map[stacker] = Stacker(block.timestamp.add(_delayInDay.mul(1 days)), amount, gift, false);
        _array.push(stacker);
        _decreasePool(gift.amount);
    }

    function _release(address stacker) private returns (uint256) {
        require(_exist(stacker), "StackingBatch: stacker not exist");
        require(_getUnlockDate(stacker) < block.timestamp, "StackingBatch: tokens are not releasable for now");
        require(!_released(stacker), "StackingBatch: stacker has already released these TOKENs");

        uint256 releasable = _getReleasable(stacker);
        require(releasable > 0, "StackingBatch: no tokens to release");

        _map[stacker].released = true;

        return releasable;
    }

    function _generateGift(uint256 amount) private view returns (Gift memory) {
        if (amount == SMALL) {
            // 7% rewarded
            // No Ads for ever
            return Gift(amount.div(100).mul(7), true, false);
        } else if (amount == MEDIUM) {
            // 11% rewarded
            // No Ads for ever
            return Gift(amount.div(100).mul(11), true, false);
        } else if (amount == LARGE) {
            // 15% rewarded
            // No Ads for ever
            // 1 NFT free
            return Gift(amount.div(100).mul(15), true, true);
        } else {
            return Gift(0, false, false);
        }
    }

    // total

    function _getTotalStacked() private view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < _array.length; i++) {
            if (_map[_array[i]].released == false) {
                total += _map[_array[i]].amount;
            }
        }
        return total;
    }

    function _getTotalReleased() private view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < _array.length; i++) {
            if (_map[_array[i]].released == true) {
                total += _map[_array[i]].amount;
            }
        }
        return total;
    }

    function _getTotalReleasable() private view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < _array.length; i++) {
            if (_map[_array[i]].released == false) {
                total += _map[_array[i]].amount + _map[_array[i]].gift.amount;
            }
        }
        return total;
    }

    // pool

    function _getPool() private view returns (uint256) {
        return _pool;
    }

    function _increasePool(uint256 amount) private {
        _pool = _pool.add(amount);
    }

    function _decreasePool(uint256 amount) private {
        _pool = _pool.sub(amount);
    }

    // stacker

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
        if (!_released(stacker)) {
            return _map[stacker].amount;
        }
        return 0;
    }

    function _getGiftAmount(address stacker) private view returns (uint256) {
        return _map[stacker].gift.amount;
    }

    function _getGiftNoAds(address stacker) private view returns (bool) {
        return _map[stacker].gift.noAds;
    }

    function _getGiftFreeExclusiveBadge(address stacker) private view returns (bool) {
        return _map[stacker].gift.freeExclusiveBadge;
    }

    function _getUnlockDate(address stacker) private view returns (uint) {
        return _map[stacker].unlockDate;
    }
}