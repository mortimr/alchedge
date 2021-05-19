// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import './interfaces/IHegicETHOptions.sol';
import './interfaces/ICurve.sol';
import './interfaces/IUniswapV2Router02.sol';
import './interfaces/IChainlinkAggregatorV3.sol';
import './interfaces/IERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import './interfaces/IWETH.sol';

contract TBDETH {
    using SafeMath for uint256;

    ICurve alUSDMetaPool;
    IHegicETHOptions hegicETHOptions;
    IUniswapV2Router02 uniswapV2Router02;
    IERC20 alUSD;
    IERC20 Dai;
    IWETH Weth;
    address[] public uniswapExchangePath;
    uint256 constant PRICE_DECIMALS = 1e8;

    event PurchaseOption(address indexed owner, uint256 optionID, uint256 purchasePrice, address purchaseToken, uint256 fees);

    constructor(
        address _hegicETHOptions,
        address _alUSD,
        address _Dai,
        address _Weth,
        address _alUSDMetaPool,
        address _uniswapV2Router02
    ) {
        alUSDMetaPool = ICurve(_alUSDMetaPool);
        hegicETHOptions = IHegicETHOptions(_hegicETHOptions);
        alUSD = IERC20(_alUSD);
        Dai = IERC20(_Dai);
        Weth = IWETH(_Weth);
        uniswapV2Router02 = IUniswapV2Router02(_uniswapV2Router02);

        uniswapExchangePath = new address[](2);
        uniswapExchangePath[0] = _Dai;
        uniswapExchangePath[1] = _Weth;
    }

    function purchaseEthOptionWithAlUSD(
        uint256 amount,
        uint256 strike,
        uint256 period,
        address owner,
        IHegicETHOptions.OptionType optionType,
        uint256 minETH
    ) public returns (uint256 optionID) {
        require(alUSD.transferFrom(msg.sender, address(this), amount), 'TBD/cannot-transfer-alusd');

        uint256 curveDyInDai = alUSDMetaPool.get_dy_underlying(0, 1, amount);
        alUSD.approve(address(alUSDMetaPool), amount);
        require(
            alUSDMetaPool.exchange_underlying(int128(0), int128(1), amount, curveDyInDai) == curveDyInDai,
            'TBD/cannot-swap-alusd-to-dai'
        );

        Dai.approve(address(uniswapV2Router02), curveDyInDai);

        uint256[] memory uniswapAmounts = uniswapV2Router02.swapExactTokensForETH(
            curveDyInDai,
            minETH,
            uniswapExchangePath,
            address(this),
            block.timestamp
        );


        uint256 optionAmount = getAmount(period, uniswapAmounts[1], strike, optionType);

        optionID = hegicETHOptions.create{value: uniswapAmounts[1]}(period, optionAmount, strike, optionType);
        hegicETHOptions.transfer(optionID, payable(owner));

        emit PurchaseOption(owner, optionID, amount, address(alUSD), uniswapAmounts[1]);

        return optionID;
    }

    receive() external payable {}

    function getEthAmountFromAlUSD(uint256 amount) external view returns (uint256) {
        uint256 curveDyInDai = alUSDMetaPool.get_dy_underlying(0, 1, amount);
        uint256[] memory uniswapWethOutput = uniswapV2Router02.getAmountsOut(curveDyInDai, uniswapExchangePath);
        return uniswapWethOutput[1];
    }

    function getAmount(
        uint256 period,
        uint256 fees,
        uint256 strike,
        IHegicETHOptions.OptionType optionType
    ) public view returns (uint256) {
        require(
            optionType == IHegicETHOptions.OptionType.Put || optionType == IHegicETHOptions.OptionType.Call,
            'invalid option type'
        );
        (, int256 latestPrice, , , ) = IChainlinkAggregatorV3(hegicETHOptions.priceProvider()).latestRoundData();
        uint256 currentPrice = uint256(latestPrice);
        uint256 iv = hegicETHOptions.impliedVolRate();

        if (optionType == IHegicETHOptions.OptionType.Put) {
            if (strike > currentPrice) {
                // ITM Put Fee
                uint256 nume = fees.mul(currentPrice).mul(PRICE_DECIMALS);
                uint256 sqrtPeriod = sqrt(period);
                uint256 denom = currentPrice.mul(PRICE_DECIMALS).div(100);
                denom = denom.add(sqrtPeriod.mul(iv).mul(strike));
                denom = denom.add(PRICE_DECIMALS.mul(strike.sub(currentPrice)));
                return nume.div(denom);
            } else {
                // OTM Put Fee
                uint256 nume = fees.mul(currentPrice).mul(PRICE_DECIMALS);
                uint256 sqrtPeriod = sqrt(period);
                uint256 denom = sqrtPeriod.mul(strike).mul(iv).add(currentPrice.mul(PRICE_DECIMALS).div(100));
                return nume.div(denom);
            }
        } else {
            if (strike < currentPrice) {
                // ITM Call Fee
                uint256 nume = fees.mul(strike).mul(PRICE_DECIMALS).mul(currentPrice);
                uint256 sqrtPeriod = sqrt(period);
                uint256 denom = strike.mul(PRICE_DECIMALS).div(100).mul(currentPrice);
                denom = denom.add(sqrtPeriod.mul(iv).mul(currentPrice).mul(currentPrice));
                denom = denom.add(strike.mul(PRICE_DECIMALS).mul(currentPrice.sub(strike)));
                return nume.div(denom);
            } else {
                // OTM Call Fee
                uint256 nume = fees.mul(strike).mul(PRICE_DECIMALS);
                uint256 sqrtPeriod = sqrt(period);
                uint256 denom = sqrtPeriod.mul(currentPrice).mul(iv).add(strike.mul(PRICE_DECIMALS).div(100));
                return nume.div(denom);
            }
        }
    }

    /**
     * @return result Square root of the number
     */
    function sqrt(uint256 x) private pure returns (uint256 result) {
        result = x;
        uint256 k = x.div(2).add(1);
        while (k < result) (result, k) = (k, x.div(k).add(k).div(2));
    }

}
