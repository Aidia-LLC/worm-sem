export type ElectronMessage = {
  type: "ERROR" | "SUCCESS";
  id: number;
  code?: number;
  message?: string;
  payload?: any;
  filename?: string;
}
