const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BSC_RPC = "https://bsc-dataseed.binance.org/";

const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const USDT_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

const provider = new ethers.JsonRpcProvider(BSC_RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, wallet);

app.post("/relay", async (req, res) => {
  const { sender, recipient, amount, memo, timestamp, signature } = req.body;

  if (!sender || !recipient || !amount || !signature) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const message = JSON.stringify({ sender, recipient, amount, memo, timestamp });

  try {
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== sender.toLowerCase()) {
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    const decimals = await usdt.decimals();
    const tokenAmount = ethers.parseUnits(amount, decimals);

    const tx = await usdt.transfer(recipient, tokenAmount);
    await tx.wait();

    return res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    console.error("Relay error:", err);
    return res.status(500).json({ success: false, message: "Relay error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Relayer running on port ${PORT}`));
