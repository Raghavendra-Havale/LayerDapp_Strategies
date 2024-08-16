const { default: BigNumber } = require("bignumber.js");

async function main() {
  require("dotenv").config();
  const { ETH_NODE_URL, PRIVATE_KEY } = process.env;
  const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
  const web3 = createAlchemyWeb3(ETH_NODE_URL);
  const ABI = require("./ABIs/flashLoanABI.json");

  //The LSA address which you are using
  const LSA = "0x04ca0B06Eac6178Fe5962B928d669e4686e72463";

  //The flashLoan connector contract
  const flashLoanConnector = new web3.eth.Contract(
    ABI,
    "0xeB245A334cCD66668a8B4355b95E6a9A17CD2763"
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

  const token = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
  const amt = "1000";
  const flashLoanFee = 0.05;
  const payBackAmt = new BigNumber(amt)
    .times(100 + flashLoanFee)
    .dividedBy(100)
    .toFixed(0);

  const flashPayback = flashLoanConnector.methods
    .flashPayback(token, payBackAmt, 0, 0)
    .encodeABI();

  const targets = ["LayerFlashLoanConnector"];
  const datas = [flashPayback];
  const flashPaybackData = web3.eth.abi.encodeParameters(
    ["string[]", "bytes[]"],
    [targets, datas]
  );

  const route = 5;
  const data = flashPaybackData;
  const extraData = "0x";

  const encodedFunctionCall1 = flashLoanConnector.methods
    .flashBorrowAndCast(token, amt, route, data, extraData)
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
