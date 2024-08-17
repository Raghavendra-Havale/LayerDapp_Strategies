async function main() {
  require("dotenv").config();
  const { ETH_NODE_URL, PRIVATE_KEY } = process.env;
  const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
  const web3 = createAlchemyWeb3(ETH_NODE_URL);
  const aaveABI = require("./ABIs/aave.json");
  const oneInchABI = require("./ABIs/1inch.json");
  const axios = require("axios");

  const LSAAddress = "0x04ca0B06Eac6178Fe5962B928d669e4686e72463";
  const aaveConnector = new web3.eth.Contract(
    aaveABI,
    "0x7BfF285c9Dc5CCD96177E481BEde4D3B9361D2f7"
  );

  const oneInchconnector = new web3.eth.Contract(
    oneInchABI,
    "0x34b04687269e47E50BB999231393D58F9cb9E9Ae"
  );

  const usdtToken = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
  const usdcToken = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

  const amt1 = "1000";
  const amt2 = "1000";

  const withdrawCollateral = aaveConnector.methods
    .withdraw(usdtToken, amt1, 0, 0)
    .encodeABI();
  console.log("withdrawCollateral", withdrawCollateral);

  const buyToken = usdcToken;
  const sellToken = usdtToken;
  const slippage = "2"; // 1% slippage
  const sellAmount = amt1;

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
      from: LSAAddress,
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

  const supplyCollateral = aaveConnector.methods
    .deposit(usdcToken, response.data.toAmount, 0, 0)
    .encodeABI();
  console.log("supplyCollateral", supplyCollateral);

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

  const encodedData = web3.eth.abi.encodeFunctionCall(functionAbi, [
    ["LayerAaveV3Arbitrum", "LayerConnectOneInchV5", "LayerAaveV3Arbitrum"],
    [withdrawCollateral, oneInchSwap, supplyCollateral],
    "0x3103Cac5ad1fC41aF7e00E0d42665d9a690574d8",
  ]);

  console.log("calculating gas price");
  const currentGasPrice = await web3.eth.getGasPrice();
  console.log(currentGasPrice);
  console.log("estimating gas");
  const estimatedGas = await web3.eth.estimateGas({
    from: "0x3103Cac5ad1fC41aF7e00E0d42665d9a690574d8",
    to: LSAAddress,
    data: encodedData,
    value: 0,
  });
  // const estimatedGas=3398677;
  console.log(estimatedGas);
  const gasLimit = estimatedGas + 200000;

  const transaction = {
    from: "0x3103Cac5ad1fC41aF7e00E0d42665d9a690574d8",
    to: LSAAddress,
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
