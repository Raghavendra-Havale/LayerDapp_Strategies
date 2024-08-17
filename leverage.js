const { default: BigNumber } = require("bignumber.js");

async function main() {
  require("dotenv").config();
  const { ETH_NODE_URL, PRIVATE_KEY } = process.env;
  const axios = require("axios");
  const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
  const web3 = createAlchemyWeb3(ETH_NODE_URL);
  const ABI = require("./ABIs/flashLoanABI.json");
  const aaveABI = require("./ABIs/aave.json");
  const oneInchABI = require("./ABIs/1inch.json");

  //The LSA address which you are using
  const LSA = "0x04ca0B06Eac6178Fe5962B928d669e4686e72463";

  //The flashLoan connector contract
  const flashLoanConnector = new web3.eth.Contract(
    ABI,
    "0xeB245A334cCD66668a8B4355b95E6a9A17CD2763"
  );

  const aaveConnector = new web3.eth.Contract(
    aaveABI,
    "0x7BfF285c9Dc5CCD96177E481BEde4D3B9361D2f7"
  );

  const oneInchconnector = new web3.eth.Contract(
    oneInchABI,
    "0x34b04687269e47E50BB999231393D58F9cb9E9Ae"
  );

  const functionAbi = {
    constant: false,
    inputs: [
      {
        name: "_targetNames",
        type: "string[]",
      },
      {
        name: "_datas",
        type: "bytes[]",
      },
      {
        name: "_origin",
        type: "address",
      },
    ],
    name: "cast",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  };

  const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const flashBorrowToken = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const leverageToken = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
  //   const token = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
  //   const amt = "1000";
  const amt = web3.utils.toWei("0.00000001", "ether");
  const flashLoanFee = 0.05;
  const payBackAmt = new BigNumber(amt)
    .times(100 + flashLoanFee)
    .dividedBy(100)
    .toFixed(0);

  console.log("payBackAmt", payBackAmt);

  const buyToken = leverageToken;
  const sellToken = flashBorrowToken;
  const slippage = "2"; // 1% slippage
  const sellAmount = amt;

  //Getting swap data from API
  let response;
  const url = "https://api.1inch.dev/swap/v5.2/42161/swap";
  const config = {
    headers: {
      Authorization: "Bearer jxC0kSICRLVAqxhLD32hTEfjcheEr6Za",
    },
    params: {
      src: sellToken,
      dst: buyToken,
      amount: sellAmount,
      from: LSA,
      slippage: slippage,
      disableEstimate: true,
    },
  };

  try {
    response = await axios.get(url, config);
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }

  const oneInchSwap = oneInchconnector.methods
    .sell(
      buyToken,
      sellToken,
      sellAmount,
      response.data.toAmount,
      response.data.tx.data,
      0
    )
    .encodeABI();
  console.log("encode oneInchSwap:", oneInchSwap);
  console.log("response.data.toAmount", response.data.toAmount);

  const aaveDeposit = aaveConnector.methods
    .deposit(leverageToken, 2 * response.data.toAmount, 0, 0)
    .encodeABI();
  console.log("encode aaveDeposit:", aaveDeposit);

  const aaveBorrow = aaveConnector.methods
    .borrow(flashBorrowToken, amt, 2, 0, 0)
    .encodeABI();
  console.log("encode aaveBorrow:", aaveBorrow);

  const flashPayback = flashLoanConnector.methods
    .flashPayback(flashBorrowToken, payBackAmt, 0, 0)
    .encodeABI();

  const targets = [
    "LayerConnectOneInchV5",
    "LayerAaveV3Arbitrum",
    "LayerAaveV3Arbitrum",
    "LayerFlashLoanConnector",
  ];
  const datas = [oneInchSwap, aaveDeposit, aaveBorrow, flashPayback];
  const flashPaybackData = web3.eth.abi.encodeParameters(
    ["string[]", "bytes[]"],
    [targets, datas]
  );

  const route = 5;
  const data = flashPaybackData;
  const extraData = "0x";

  const encodedFunctionCall1 = flashLoanConnector.methods
    .flashBorrowAndCast(flashBorrowToken, amt, route, data, extraData)
    .encodeABI();
  // console.log("encode", encodedFunctionCall1);

  const encodedData = web3.eth.abi.encodeFunctionCall(functionAbi, [
    ["LayerFlashLoanConnector"],
    [encodedFunctionCall1],
    "0x3103Cac5ad1fC41aF7e00E0d42665d9a690574d8",
  ]);

  console.log("encode", encodedData);

  console.log("calculating gas price");
  const currentGasPrice = await web3.eth.getGasPrice();
  console.log(currentGasPrice);
  console.log("estimating gas");
  const estimatedGas = await web3.eth.estimateGas({
    from: "0x3103Cac5ad1fC41aF7e00E0d42665d9a690574d8",
    to: LSA,
    data: encodedData,
    value: 0,
  });
  // const estimatedGas = 3398677;
  console.log(estimatedGas);
  const gasLimit = estimatedGas + 200000;

  const transaction = {
    from: "0x3103Cac5ad1fC41aF7e00E0d42665d9a690574d8",
    to: LSA,
    data: encodedData,
    value: 0, // or any ETH amount if required
    gas: gasLimit,
    gasPrice: currentGasPrice,
  };

  const signedTx = await web3.eth.accounts.signTransaction(
    transaction,
    PRIVATE_KEY
  );

  web3.eth.sendSignedTransaction(
    signedTx.rawTransaction,
    function (error, hash) {
      if (!error) {
        console.log(
          "🎉 The hash of your transaction is: ",
          hash,
          "\n Check Alchemy's Mempool to view the status of your transaction!"
        );
      } else {
        console.log(
          "❗Something went wrong while submitting your transaction:",
          error
        );
      }
    }
  );
}

main();
