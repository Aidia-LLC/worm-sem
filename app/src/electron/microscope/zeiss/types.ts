export type ZeissMessage = {
  type: "ERROR" | "SUCCESS" | "READY";
  id: number;
  code?: number;
  message?: string;
  payload?: any;
  filename?: string;
};
