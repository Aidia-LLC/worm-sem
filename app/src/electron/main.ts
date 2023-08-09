import { ChildProcess } from "child_process";
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { platform } from "process";
import { Command, GrabFullFrameCommand } from "../MicroscopeBridge/types";
import { getFilename } from "./filesystem";
import { initializeMaskApi } from "./maskApi";
import { MicroscopeCallingInterface } from "./MicroscopeCallingInterface";
import { ZeissInterface } from "./MicroscopeCallingInterface/ZeissInterface";
import { ElectronMessage } from "./types";
import { createWindow } from "./window";

const isProduction = app.isPackaged;

process.env.DIST = path.join(__dirname, "../dist");
process.env.PUBLIC = isProduction
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

let browserWindow: BrowserWindow | null;
let maskApi: ChildProcess | null = null;

const microscopeApi: MicroscopeCallingInterface = new ZeissInterface({
  dryRun: platform === "darwin", // on macOS for testing, just do a dry run
});

app.on("window-all-closed", () => {
  app.quit();
});

app.whenReady().then(async () => {
  maskApi = await initializeMaskApi();
  await microscopeApi.initialize();

  ipcMain.handle("SEMClient:Send", async (_, command: Command) => {
    console.log("Received message from renderer:", JSON.stringify(command));
    try {
      switch (command.type) {
        case "GRAB_FULL_FRAME": {
          const grabCommand = command as GrabFullFrameCommand;
          const filename = await getFilename(grabCommand, browserWindow!);
          if (!filename) {
            browserWindow?.webContents.send("SEMClient:Received", {
              id: grabCommand.id,
              code: 400,
              type: "ERROR",
              message: "File selector aborted",
            } satisfies ElectronMessage);
            return;
          }
          grabCommand.filename = filename;
          console.log("Sending message to microscope api:", JSON.stringify(grabCommand));
          const response = await microscopeApi.grabFullFrame(
            grabCommand.name,
            grabCommand.filename
          );
          browserWindow?.webContents.send("SEMClient:Received", {
            id: grabCommand.id,
            code: 200,
            type: "SUCCESS",
            payload: response.payload,
            filename: response.filename,
          } satisfies ElectronMessage);
          break;
        }
        case "GET_PARAM": {
          const response = await microscopeApi.getParam(command.param);
          browserWindow?.webContents.send("SEMClient:Received", {
            id: command.id,
            code: 200,
            type: "SUCCESS",
            payload: response,
          } satisfies ElectronMessage);
          break;
        }
        case "SET_PARAM": {
          const response = await microscopeApi.setParam(
            command.param,
            command.value
          );
          browserWindow?.webContents.send("SEMClient:Received", {
            id: command.id,
            code: 200,
            type: "SUCCESS",
            payload: response,
          } satisfies ElectronMessage);
          break;
        }
        case "CONNECT": {
          const response = await microscopeApi.connect();
          browserWindow?.webContents.send("SEMClient:Received", {
            id: command.id,
            code: 200,
            type: "SUCCESS",
            payload: response,
          } satisfies ElectronMessage);
        }
      }
    } catch (err) {
      console.error(err);
      browserWindow?.webContents.send("SEMClient:Received", {
        id: command.id,
        code: 500,
        type: "ERROR",
        message: (err as Error)?.message || "Unknown error",
      } satisfies ElectronMessage);
    }
  });

  browserWindow = createWindow();

  app.on("before-quit", () => {
    microscopeApi.shutdown();
    maskApi?.kill();
  });

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0)
      browserWindow = createWindow();
  });
});
