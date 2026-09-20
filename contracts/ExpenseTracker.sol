// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ExpenseTracker
/// @notice A public, on-chain money tracker. Anyone can connect their wallet
///         and log expenses as permanent, append-only records. Each expense is
///         stored per-wallet, so a wallet only ever sees and controls its own
///         entries. EVM-compatible: works on BOT Chain (testnet 968 / mainnet 677).
///
///         Also supports SHARED GROUP LEDGERS: multiple wallets can contribute
///         expenses to one publicly-readable group ledger, identified by a
///         bytes32 id. This is what makes the "on-chain" part of this app
///         actually matter — a private personal log doesn't need a blockchain,
///         but a shared ledger multiple untrusting parties need to verify does.
contract ExpenseTracker {
    // -----------------------------------------------------------------
    // PERSONAL LEDGER (unchanged from v1 — do not modify)
    // -----------------------------------------------------------------

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

    // -----------------------------------------------------------------
    // GROUP LEDGERS (new)
    // A group is created once (by any wallet) with a unique bytes32 id
    // generated client-side. After creation, ANY wallet can add expenses
    // to that group — that's the point: a shared ledger multiple people
    // contribute to and can all independently verify.
    // -----------------------------------------------------------------

    struct GroupExpense {
        address payer;        // wallet that logged this entry
        uint256 amount;       // amount in minor units (e.g. cents)
        string description;   // what the expense was for
        uint256 timestamp;    // block time the record was written
    }

    mapping(bytes32 => bool) public groupExists;
    mapping(bytes32 => string) public groupName;
    mapping(bytes32 => address) public groupCreator;
    mapping(bytes32 => uint256) public groupTotalSpent;
    mapping(bytes32 => GroupExpense[]) private _groupExpenses;

    event GroupCreated(bytes32 indexed groupId, string name, address indexed creator);
    event GroupExpenseAdded(
        bytes32 indexed groupId,
        address indexed payer,
        uint256 indexed index,
        uint256 amount,
        string description,
        uint256 timestamp
    );

    /// @notice Create a new shared group ledger. groupId must be unique;
    ///         it's generated client-side as 32 random bytes (see chain.js
    ///         `randomGroupId()`), so collisions are astronomically unlikely.
    function createGroup(bytes32 groupId, string calldata name) external {
        require(!groupExists[groupId], "Group already exists");
        require(bytes(name).length > 0, "Name required");
        require(bytes(name).length <= 80, "Name too long");

        groupExists[groupId] = true;
        groupName[groupId] = name;
        groupCreator[groupId] = msg.sender;

        emit GroupCreated(groupId, name, msg.sender);
    }

    /// @notice Log an expense to a shared group ledger. Any wallet can
    ///         contribute to any existing group.
    function addGroupExpense(
        bytes32 groupId,
        uint256 amount,
        string calldata description
    ) external {
        require(groupExists[groupId], "Group does not exist");
        require(amount > 0, "Amount must be greater than zero");
        require(bytes(description).length > 0, "Description required");
        require(bytes(description).length <= 200, "Description too long");

        _groupExpenses[groupId].push(
            GroupExpense(msg.sender, amount, description, block.timestamp)
        );
        groupTotalSpent[groupId] += amount;

        emit GroupExpenseAdded(
            groupId,
            msg.sender,
            _groupExpenses[groupId].length - 1,
            amount,
            description,
            block.timestamp
        );
    }

    /// @notice Read every expense logged to a group. No wallet required to
    ///         call this — this is what makes the ledger publicly verifiable.
    function getGroupExpenses(bytes32 groupId) external view returns (GroupExpense[] memory) {
        return _groupExpenses[groupId];
    }

    /// @notice How many expenses a group has logged.
    function groupExpenseCount(bytes32 groupId) external view returns (uint256) {
        return _groupExpenses[groupId].length;
    }
}