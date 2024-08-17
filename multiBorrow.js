async function main() {
  require("dotenv").config();
  const { ETH_NODE_URL, PRIVATE_KEY } = process.env;
  const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
  const web3 = createAlchemyWeb3(ETH_NODE_URL);
  const aaveABI = require("./ABIs/aave.json");

  const LSAAddress = "0x04ca0B06Eac6178Fe5962B928d669e4686e72463";
  const aaveConnector = new web3.eth.Contract(
    aaveABI,
    "0x7BfF285c9Dc5CCD96177E481BEde4D3B9361D2f7"
  );

  const daiToken = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
  const usdcToken = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

  const amt1 = "100000000000";
  const amt2 = "1000";

  const encodedFunctionCall1 = aaveConnector.methods
    .borrow(daiToken, amt1, 2, 0, 0)
    .encodeABI();
  console.log("encode", encodedFunctionCall1);

  const encodedFunctionCall2 = aaveConnector.methods
    .borrow(usdcToken, amt2, 2, 0, 0)
    .encodeABI();
  console.log("encode", encodedFunctionCall2);

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
    ["LayerAaveV3Arbitrum", "LayerAaveV3Arbitrum"],
    [encodedFunctionCall1, encodedFunctionCall2],
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
