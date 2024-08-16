async function main() {
  require("dotenv").config();
  const axios = require("axios");
  const { ETH_NODE_URL, PRIVATE_KEY } = process.env;
  const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
  const web3 = createAlchemyWeb3(ETH_NODE_URL);
  const ABI = require("./ABIs/1inch.json");
  const instaAccountAddress = "0x04ca0B06Eac6178Fe5962B928d669e4686e72463";
  const connector = new web3.eth.Contract(
    ABI,
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

  const sellToken1 = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
  const buyToken1 = "0x912CE59144191C1204E64559FE8253a0e49E6548";
  const slippage1 = "2"; // 1% slippage1
  const sellAmount1 = "200";

  const sellToken2 = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const buyToken2 = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const slippage2 = "2"; // 1% slippage
  const sellAmount2 = "100000000000";

  const sellToken3 = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
  const buyToken3 = "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0";
  const slippage3 = "2"; // 1% slippage
  const sellAmount3 = "10000000000000";

  //Getting swap data from API for swap1
  let response1;
  const url1 = "https://api.1inch.dev/swap/v5.2/42161/swap";
  const config1 = {
    headers: {
      Authorization: "Bearer jxC0kSICRLVAqxhLD32hTEfjcheEr6Za",
    },
    params: {
      src: sellToken1,
      dst: buyToken1,
      amount: sellAmount1,
      from: instaAccountAddress,
      slippage: slippage1,
      disableEstimate: true,
    },
  };

  try {
    response1 = await axios.get(url1, config1);
    console.log(response1.data);
  } catch (error) {
    console.error(error);
  }

  const encodedFunctionCall1 = connector.methods
    .sell(
      buyToken1,
      sellToken1,
      sellAmount1,
      response1.data.toAmount,
      response1.data.tx.data,
      0
    )
    .encodeABI();
  console.log("encode", encodedFunctionCall1);

  //Getting swap data from API for swap2
  let response2;
  const url2 = "https://api.1inch.dev/swap/v5.2/42161/swap";
  const config2 = {
    headers: {
      Authorization: "Bearer jxC0kSICRLVAqxhLD32hTEfjcheEr6Za",
    },
    params: {
      src: sellToken2,
      dst: buyToken2,
      amount: sellAmount2,
      from: instaAccountAddress,
      slippage: slippage2,
      disableEstimate: true,
    },
  };

  try {
    response2 = await axios.get(url2, config2);
    console.log(response2.data);
  } catch (error) {
    console.error(error);
  }

  const encodedFunctionCall2 = connector.methods
    .sell(
      buyToken2,
      sellToken2,
      sellAmount2,
      response2.data.toAmount,
      response2.data.tx.data,
      0
    )
    .encodeABI();
  console.log("encode", encodedFunctionCall2);

  //Getting swap data from API for swap3
  let response3;
  const url3 = "https://api.1inch.dev/swap/v5.2/42161/swap";
  const config3 = {
    headers: {
      Authorization: "Bearer jxC0kSICRLVAqxhLD32hTEfjcheEr6Za",
    },
    params: {
      src: sellToken3,
      dst: buyToken3,
      amount: sellAmount3,
      from: instaAccountAddress,
      slippage: slippage3,
      disableEstimate: true,
    },
  };

  try {
    response3 = await axios.get(url3, config3);
    console.log(response3.data);
  } catch (error) {
    console.error(error);
  }

  const encodedFunctionCall3 = connector.methods
    .sell(
      buyToken3,
      sellToken3,
      sellAmount3,
      response3.data.toAmount,
      response3.data.tx.data,
      0
    )
    .encodeABI();
  console.log("encode", encodedFunctionCall3);

  const encodedData = web3.eth.abi.encodeFunctionCall(functionAbi, [
    ["LayerConnectOneInchV5", "LayerConnectOneInchV5", "LayerConnectOneInchV5"],
    [encodedFunctionCall1, encodedFunctionCall2, encodedFunctionCall3],
    "0x3103Cac5ad1fC41aF7e00E0d42665d9a690574d8",
  ]);

  console.log("calculating gas price");
  const currentGasPrice = await web3.eth.getGasPrice();
  console.log(currentGasPrice);
  console.log("estimating gas");
  const estimatedGas2 = await web3.eth.estimateGas({
    from: "0x3103Cac5ad1fC41aF7e00E0d42665d9a690574d8",
    to: instaAccountAddress,
    data: encodedData,
    value: 0,
  });
  // const estimatedGas=3398677;
  console.log(estimatedGas2);
  const gasLimit = estimatedGas2 + 200000;

  const transaction2 = {
    from: "0x3103Cac5ad1fC41aF7e00E0d42665d9a690574d8",
    to: instaAccountAddress,
    data: encodedData,
    value: 0, // or any ETH amount if required
    gas: gasLimit,
    gasPrice: currentGasPrice,
  };

  const signedTx2 = await web3.eth.accounts.signTransaction(
    transaction2,
    PRIVATE_KEY
  );

  web3.eth.sendSignedTransaction(
    signedTx2.rawTransaction,
    function (error, hash) {
      if (!error) {
        console.log(
          "🎉 The hash of your transaction2 is: ",
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
