// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ExpenseTracker
/// @notice A public, on-chain money tracker. Anyone can connect their wallet
///         and log expenses as permanent, append-only records. Each expense is
///         stored per-wallet, so a wallet only ever sees and controls its own
///         entries. EVM-compatible: works on BOT Chain (testnet 968 / mainnet 677).
contract ExpenseTracker {
    struct Expense {
        uint256 amount;      // amount in minor units (e.g. cents) to avoid decimals
        string description;  // what the expense was for
        uint256 timestamp;   // block time the record was written
    }

    // Each wallet owns its own append-only list of expenses.
    mapping(address => Expense[]) private _expenses;

    // Running total logged per wallet (in minor units), for cheap reads.
    mapping(address => uint256) public totalSpent;

    /// @notice Emitted every time a wallet logs an expense.
    event ExpenseAdded(
        address indexed owner,
        uint256 indexed index,
        uint256 amount,
        string description,
        uint256 timestamp
    );

    /// @notice Log a new expense for the caller's wallet.
    /// @param amount Amount in minor units (e.g. cents). Must be > 0.
    /// @param description Short text describing the expense. Must not be empty.
    function addExpense(uint256 amount, string calldata description) external {
        require(amount > 0, "Amount must be greater than zero");
        require(bytes(description).length > 0, "Description required");
        require(bytes(description).length <= 200, "Description too long");

        _expenses[msg.sender].push(
            Expense(amount, description, block.timestamp)
        );
        totalSpent[msg.sender] += amount;

        emit ExpenseAdded(
            msg.sender,
            _expenses[msg.sender].length - 1,
            amount,
            description,
            block.timestamp
        );
    }

    /// @notice How many expenses a wallet has logged.
    function expenseCount(address wallet) external view returns (uint256) {
        return _expenses[wallet].length;
    }

    /// @notice Read a single expense by index for a given wallet.
    function getExpense(address wallet, uint256 index)
        external
        view
        returns (uint256 amount, string memory description, uint256 timestamp)
    {
        require(index < _expenses[wallet].length, "Index out of range");
        Expense storage e = _expenses[wallet][index];
        return (e.amount, e.description, e.timestamp);
    }

    /// @notice Read every expense a wallet has logged, newest handling left to the UI.
    /// @dev Returns the full array in one call so the frontend can render the list.
    function getExpenses(address wallet) external view returns (Expense[] memory) {
        return _expenses[wallet];
    }
}
