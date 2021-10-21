// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

/****************************
* 
* Simple implementation of ERC20 Token based on openzeppelin contracts.
******/

contract Token is ERC20, ERC20Capped, ERC20Burnable, ERC20Pausable, ERC20Snapshot, AccessControlEnumerable {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant SNAPER_ROLE = keccak256("SNAPER_ROLE");

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`, `PAUSER_ROLE` and `SNAPER_ROLE`
     * to the account `owner`.
     *
     * See {ERC20-constructor}.
     */
    constructor(address owner, string memory name, string memory symbol, uint256 cap) ERC20(name, symbol) ERC20Capped(cap) {
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _setupRole(MINTER_ROLE, owner);
        _setupRole(PAUSER_ROLE, owner);
        _setupRole(SNAPER_ROLE, owner);
    }

    /****************************
     * public functions
     ******/

    /**
     * @dev Creates `amount` new tokens for `to`.
     *
     * See {ERC20-_mint}.
     *
     * Requirements:
     *
     * - the caller must have the `MINTER_ROLE`.
     */
    function mint(address to, uint256 amount) public {
        require(hasRole(MINTER_ROLE, _msgSender()), "YESorNOToken: must have minter role to mint");
        require(amount > 0, "YESorNOToken: amount must be more than 0");
        _mint(to, amount);
    }

    /**
     * @dev Creates a new snapshot ID.
     *
     * See {ERC20Snapshot}.
     *
     * Requirements:
     *
     * - the caller must have the `SNAPER_ROLE`.
     *
     * @return uint256 Thew new snapshot ID.
     */
    function snapshot() external returns (uint256) {
        require(hasRole(SNAPER_ROLE, _msgSender()), "YESorNOToken: must have snaper role for make a snapshot");
        return _snapshot();
    }

    /**
     * @dev Pauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_pause}.
     *
     * Requirements:
     *
     * - the caller must have the `PAUSER_ROLE`.
     */
    function pause() public {
        require(hasRole(PAUSER_ROLE, _msgSender()), "YESorNOToken: must have pauser role to pause");
        _pause();
    }

    /**
     * @dev Unpauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_unpause}.
     *
     * Requirements:
     *
     * - the caller must have the `PAUSER_ROLE`.
     */
    function unpause() public {
        require(hasRole(PAUSER_ROLE, _msgSender()), "YESorNOToken: must have pauser role to unpause");
        _unpause();
    }

    /****************************
     * internal functions
     ******/

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override(ERC20, ERC20Pausable, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _mint(address account, uint256 amount) internal override(ERC20, ERC20Capped) {
        super._mint(account, amount);
    }
}
