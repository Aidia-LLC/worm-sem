import appRootDir from "app-root-dir";
import { ChildProcess, exec } from "child_process";
import { app } from "electron";
import path from "path";
import { PYTHON_PORT } from "../../config";

const isProduction = app.isPackaged;
export const maskServerPath = isProduction
  ? path.join(path.dirname(appRootDir.get()), "mask-server")
  : path.join(appRootDir.get(), "..", "mask-server");

export const initializeMaskApi = async (): Promise<ChildProcess> => {
  const process = exec(`python -m flask run -p ${PYTHON_PORT}`, {
    cwd: maskServerPath,
  });

  return new Promise((resolve, reject) => {
    process
      .on("exit", (e) => {
        console.log("Mask server exited", e);
        reject(e);
      })
      .on("error", (err) => {
        console.log("Mask server error", err);
        reject(err);
      })
      .on("spawn", () => {
        console.log("Mask server started.");
        resolve(process);
      });

    process.stderr?.on("data", (data: Buffer) => {
      console.error(data.toString("utf8"));
    });

    process.stdout?.on("data", (data: Buffer) => {
      console.log(data.toString("utf8"));
    });
  });
};
