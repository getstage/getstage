import { z } from "zod";

export const projectAssetSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
});

export type ProjectAsset = z.infer<typeof projectAssetSchema>;
