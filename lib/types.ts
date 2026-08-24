export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export type Project = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: ProjectStatus;
  target_delivery_date: string | null;
};
