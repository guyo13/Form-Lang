const express = require("express");
const { computeAndSerializeAst } = require("../out/cjs/lib");

const app = express();
const port = 3000; // You can change this to any port you prefer

app.use(express.json());

app.post("/compute/ast", async (req, res) => {
  try {
    const { sourceCode, formComponentsCode, fieldComponentsCode } = req.body;
    if (!sourceCode) {
      return res
        .status(400)
        .json({ status: "error", error: "Missing sourceCode parameter" });
    } else if (!formComponentsCode) {
      return res
        .status(400)
        .json({ status: "error", error: "Missing formComponentsCode" });
    } else if (!fieldComponentsCode) {
      return res
        .status(400)
        .json({ status: "error", error: "Missing fieldComponentsCode" });
    }

    const result = await computeAndSerializeAst(
      sourceCode,
      formComponentsCode,
      fieldComponentsCode,
    );
    res.json({ status: "ok", result });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ status: "error", error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
