import { z } from "zod";

// Reused primitives. Zod treats unknown object keys as valid by default
// (strict mode would reject extras); we accept them because clients may
// legitimately send forward-compatible fields that routes ignore.
export const uuidSchema = z.string().uuid();

// Narrow literal tuple keeps the inferred type as the shared ContentStatus
// union, not a widened string.
export const contentStatusSchema = z.enum([
  "backlog",
  "in_progress",
  "in_review",
  "done",
]);

export const nonEmptyString = z
  .string()
  .trim()
  .min(1, "must be a non-empty string");

// Labels
export const createLabelSchema = z.object({
  name: nonEmptyString,
  color: nonEmptyString,
});

export const updateLabelSchema = z
  .object({
    name: nonEmptyString.optional(),
    color: nonEmptyString.optional(),
  })
  .refine((v) => v.name !== undefined || v.color !== undefined, {
    message: "at least one field (name or color) is required",
  });

// Projects
export const createProjectSchema = z.object({
  title: nonEmptyString,
  description: z.string().optional(),
  labelIds: z.array(uuidSchema).optional(),
});

export const updateProjectSchema = z
  .object({
    title: nonEmptyString.optional(),
    description: z.string().optional(),
    status: contentStatusSchema.optional(),
    sort_order: z.number().int().optional(),
    labelIds: z.array(uuidSchema).optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.description !== undefined ||
      v.status !== undefined ||
      v.sort_order !== undefined ||
      v.labelIds !== undefined,
    { message: "no fields to update" }
  );

// Tickets
export const createTicketSchema = z.object({
  title: nonEmptyString,
  description: z.string().optional(),
});

export const updateTicketSchema = z
  .object({
    title: nonEmptyString.optional(),
    description: z.string().optional(),
    status: contentStatusSchema.optional(),
    sort_order: z.number().int().optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.description !== undefined ||
      v.status !== undefined ||
      v.sort_order !== undefined,
    { message: "no fields to update" }
  );

// Comments
export const commentBodySchema = z.object({
  body: nonEmptyString,
});

// Assets
export const createAssetSchema = z.object({
  filename: nonEmptyString,
  mime_type: z.string().default(""),
  size_bytes: z
    .number()
    .int()
    .min(0, "size_bytes must be a non-negative integer"),
});

// Reorder
export const reorderTicketsSchema = z.object({
  status: contentStatusSchema,
  ticketIds: z
    .array(uuidSchema)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "ticketIds must not contain duplicates",
    }),
});

// Slack integration
// Slack incoming-webhook URLs all live under https://hooks.slack.com.
// Enforce that shape so obvious misconfigurations (a random URL in the
// settings form) fail fast instead of producing opaque HTTP errors at
// post time.
export const slackWebhookUrl = z
  .string()
  .url()
  .startsWith("https://hooks.slack.com/", "must be a Slack incoming webhook URL");

export const upsertSlackIntegrationSchema = z.object({
  webhook_url: slackWebhookUrl,
  channel_name: z.string().trim().max(80).default(""),
  enabled: z.boolean().default(true),
  enabled_statuses: z
    .array(contentStatusSchema)
    .min(1, "at least one status must be enabled")
    .max(4)
    .refine((s) => new Set(s).size === s.length, {
      message: "enabled_statuses must not contain duplicates",
    })
    .default(["in_review", "done"]),
});

// Params
export const idParam = z.object({ id: uuidSchema });
export const ticketIdParam = z.object({ ticketId: uuidSchema });
export const projectIdParam = z.object({ projectId: uuidSchema });
