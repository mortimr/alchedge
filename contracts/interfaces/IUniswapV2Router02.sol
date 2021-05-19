// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

interface IUniswapV2Router02 {
    function getAmountsOut(uint256 amountIn, address[] memory path) external view returns (uint256[] memory amounts);

function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
  external
  returns (uint[] memory amounts);
}
