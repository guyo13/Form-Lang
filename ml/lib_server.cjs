const express = require("express");
const { computeAndSerializeAst } = require("../out/cjs/lib");

const app = express();
const port = 3000; // You can change this to any port you prefer

app.use(express.json());

app.post("/compute/ast", async (req, res) => {
  try {
    const { sourceCode, shouldCheckErrors = false } = req.body;
    if (!sourceCode) {
      return res
        .status(400)
        .json({ status: "error", error: "Missing sourceCode parameter" });
    }
    const result = await computeAndSerializeAst(sourceCode, shouldCheckErrors);
    res.json({ status: "ok", result });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ status: "error", error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
