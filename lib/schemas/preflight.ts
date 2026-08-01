import { z } from "zod";

const httpOriginSchema = z
  .url()
  .max(300)
  .superRefine((value, context) => {
    const url = new URL(value);
    if (!(["http:", "https:"] as string[]).includes(url.protocol)) {
      context.addIssue({
        code: "custom",
        message: "Use an HTTP or HTTPS origin.",
      });
    }
    if (url.username || url.password) {
      context.addIssue({
        code: "custom",
        message: "Origins cannot contain credentials.",
      });
    }
    if (url.pathname !== "/" || url.search || url.hash) {
      context.addIssue({
        code: "custom",
        message: "Use an origin without a path, query string, or fragment.",
      });
    }
  });

export const preflightInputSchema = z.object({
  csvText: z
    .string()
    .min(1, "Paste a redirect map before running preflight.")
    .max(1_000_000),
  sourceOrigin: httpOriginSchema,
  targetOrigin: httpOriginSchema,
  migrationIntent: z.enum(["permanent", "temporary"]),
});
