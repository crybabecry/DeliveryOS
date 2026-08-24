import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const projectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(80),
  description: z.string().trim().max(5000).optional(),
  targetDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

export const deliverableSchema = z.object({
  projectId: uuidSchema,
  name: z.string().trim().min(1).max(500),
  type: z.string().trim().min(1).max(100),
  criticality: z.enum(["CRITICAL", "HIGH", "NORMAL"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  acceptanceCriteria: z.string().trim().max(5000).optional(),
});

export const inviteSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(["ADMIN", "MANAGER", "ENGINEER", "QA", "VIEWER"]),
});
