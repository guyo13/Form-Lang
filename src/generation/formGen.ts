import { z } from "zod";

const probabilitySchema = z.number().min(0).lt(1);
const integerSchema = z.number().min(0).int();

const probabilisticSearchParamsSchema = z.object({
  alpha: probabilitySchema,
  beta: probabilitySchema,
  gamma: probabilitySchema.optional().default(0),
  delta: probabilitySchema.optional().default(0),
  epsilon: probabilitySchema.optional().default(0),
  D: integerSchema.optional(),
  a: integerSchema.optional().default(0),
  b: integerSchema.min(1).default(2),
  amin: integerSchema.min(0).default(0),
  amax: integerSchema.min(0).default(3),
});

export interface ProbabilisticSearchParams {
  alpha: number;
  beta: number;
  gamma?: number;
  delta?: number;
  epsilon?: number;
  D?: number;
  a?: number;
  b?: number;
  amin?: number;
  amax?: number;
}

export default class FormCodeGen {
  readonly params: ProbabilisticSearchParams;

  constructor(params: ProbabilisticSearchParams) {
    this.params = probabilisticSearchParamsSchema.parse(params);
  }
}
