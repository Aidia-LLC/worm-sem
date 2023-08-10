import appRootDir from "app-root-dir";
import { ChildProcess, exec } from "child_process";
import { app, Notification } from "electron";
import path from "path";
import { DEBUG, PYTHON_PORT } from "../../config";

const isProduction = app.isPackaged;
export const maskServerPath = isProduction
  ? path.join(path.dirname(appRootDir.get()), "mask-server")
  : path.join(appRootDir.get(), "..", "mask-server");

export const initializeMaskApi = async (): Promise<ChildProcess> => {
  const process = exec(`python3 -m flask run -p ${PYTHON_PORT}`, {
    cwd: maskServerPath,
  });

  return new Promise((resolve, reject) => {
    process
      .on("exit", (e) => {
        if (DEBUG)
          new Notification({
            title: "Mask server exited",
            body: `Mask server exited with code ${e}`,
          }).show();
        console.log("Mask server exited", e);
        reject(e);
      })
      .on("error", (err) => {
        if (DEBUG)
          new Notification({
            title: "Mask server error",
            body: `${err}`,
          }).show();
        console.log("Mask server error", err);
        reject(err);
      })
      .on("spawn", () => {
        if (DEBUG)
          new Notification({
            title: "Mask server started",
            body: `Mask server started on port ${PYTHON_PORT}`,
          }).show();
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
