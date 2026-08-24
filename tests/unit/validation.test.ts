import { describe, expect, it } from "vitest";
import { deliverableSchema, projectSchema } from "@/lib/validation";

describe("validation", () => {
  it("accepts valid project data", () => {
    expect(projectSchema.safeParse({name:"Product Alpha",code:"PRJ-001",description:"Demo",targetDeliveryDate:"2030-01-01"}).success).toBe(true);
  });
  it("rejects malformed dates", () => {
    expect(projectSchema.safeParse({name:"Product Alpha",code:"PRJ-001",targetDeliveryDate:"tomorrow"}).success).toBe(false);
  });
  it("requires a deliverable name", () => {
    expect(deliverableSchema.safeParse({projectId:"00000000-0000-0000-0000-000000000000",name:"",type:"DOCUMENT",criticality:"NORMAL"}).success).toBe(false);
  });
});
