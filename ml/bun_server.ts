import {
  computeAndSerializeAst,
  probabilisticSearchParamsSchema,
  generateRandomFormWithModification,
  newFormGen,
} from "../out/cjs/lib";
import { z } from "zod";

const port = 3000;

const randomFormsRequestSchema = z.object({
  count: z.number().int().positive(),
  formComponentsCode: z.string(),
  fieldComponentsCode: z.string(),
  hyperparams: probabilisticSearchParamsSchema,
});

Bun.serve({
  port: port,
  async fetch(req) {
    if (req.method === "POST" && req.url.endsWith("/compute/ast")) {
      try {
        const body = await req.json();
        const { sourceCode, shouldCheckErrors = false } = body;

        if (!sourceCode) {
          return new Response(
            JSON.stringify({
              status: "error",
              error: "Missing sourceCode parameter",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const result = await computeAndSerializeAst(
          sourceCode,
          shouldCheckErrors,
        );

        return new Response(JSON.stringify({ status: "ok", result }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error processing request:", error);
        return new Response(
          JSON.stringify({ status: "error", error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    } else if (
      req.method === "POST" &&
      req.url.endsWith("/compute/random_forms")
    ) {
      try {
        const body = await req.json();
        const parsedBody = randomFormsRequestSchema.parse(body);

        const { count, formComponentsCode, fieldComponentsCode, hyperparams } =
          parsedBody;

        const formGen = await newFormGen(
          hyperparams,
          fieldComponentsCode,
          formComponentsCode,
        );
        let results = [];
        for (let i = 0; i < count; i++) {
          const {
            serializedForm,
            serializedModifiedForm,
            removedNodeEnglish,
            removedNodeContextEnglish,
          } = generateRandomFormWithModification(formGen);
          results.push({
            serializedForm,
            serializedModifiedForm,
            removedNodeEnglish,
            removedNodeContextEnglish,
          });
        }

        return new Response(JSON.stringify({ status: "ok", result: results }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return new Response(
            JSON.stringify({ status: "error", error: error.errors }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        console.error("Error processing /compute/random_forms:", error);
        return new Response(
          JSON.stringify({ status: "error", error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
  error(error) {
    console.error("Bun error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`Server listening on port ${port}`);
