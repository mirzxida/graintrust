// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockKZT is ERC20 {
    constructor() ERC20("Digital Tenge", "KZT") {
        _mint(msg.sender, 1000000000 * 10 ** decimals()); // Выпускаем тестовые тенге
    }
}