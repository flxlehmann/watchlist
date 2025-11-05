import { z } from "zod";

export const listSchema = z.object({
  name: z.string().min(1).max(100),
});

export const addItemSchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateItemSchema = z.object({
  watched: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
});
