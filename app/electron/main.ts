import appRootDir from "app-root-dir";
import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import { format } from "date-fns";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "fs";
import path from "path";
import {
  Command,
  GrabCommand,
  GrabFullFrameCommand,
  Message,
} from "../src/dto/semClient";
import { getPlatform } from "./platform";

const isProduction = app.isPackaged;

process.env.DIST = path.join(__dirname, "../dist");
process.env.PUBLIC = isProduction
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

const resourcePath = isProduction
  ? path.join(path.dirname(appRootDir.get()), "bin")
  : path.join(appRootDir.get(), "resources", getPlatform());

let browserWindow: BrowserWindow | null;
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

const filePaths = new Map<number, string>();

const createWindow = () => {
  browserWindow = new BrowserWindow({
    icon: path.join(process.env.PUBLIC, "logo.svg"),
    title: "SEM Client",
    webPreferences: {
      preload: path.join(__dirname, "./preload.js"),
    },
  });

  // Open links in the browser, not inside the application
  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (devServerUrl) {
    browserWindow.loadURL(devServerUrl);
    browserWindow.webContents.openDevTools();
  } else {
    browserWindow.loadFile(path.join(process.env.DIST, "index.html"));
  }
  return browserWindow;
};

app.on("window-all-closed", () => {
  // if (process.platform !== "darwin")
  app.quit();
});

const init = (childProcess: ChildProcessWithoutNullStreams) => {
  childProcess.on("spawn", () => {
    childProcess.stdout.on("data", (data: Buffer) => {
      const messages: Message[] = data
        .toString("utf8")
        .trim()
        .split("\n")
        .map((message) => {
          const trimmed = message.trim();
          if (trimmed.length > 0) return JSON.parse(trimmed);
          return undefined;
        })
        .filter(Boolean);
      messages.forEach((message) => {
        console.log("Received message from C#:", message);
        if (message.code === 200) {
          // grab success
          (async () => {
            const data = await fs.promises.readFile(message.payload!);
            browserWindow?.webContents.send("SEMClient:Received", {
              ...message,
              payload: Buffer.from(data).toString("base64"),
            } as Message);
          })();
        } else {
          browserWindow?.webContents.send("SEMClient:Received", message);
        }
      });
    });

    childProcess.stderr.on("data", (data: Buffer) => {
      console.error(data.toString("utf8"));
    });

    ipcMain.handle("SEMClient:Send", (_, command: Command) => {
      if (command.type === "grabFullFrame") {
        const grabCommand = command as GrabFullFrameCommand;
        dialog
          .showSaveDialog(browserWindow!, {
            filters: [{ name: "PNG", extensions: ["png"] }],
            buttonLabel: "Grab Image",
            defaultPath: `grab-${format(
              Date.now(),
              "yyyy-MM-dd-HH-mm-ss"
            )}.png`,
          })
          .then((result) => {
            if (!result.canceled && result.filePath) {
              grabCommand.filename = result.filePath;
              console.log("Sending message to C#:", grabCommand);
              childProcess.stdin.write(JSON.stringify(grabCommand) + "\n");
            }
          });
      } else if (command.type === "grab") {
        const grabCommand = command as GrabCommand;
        (async () => {
          const filePath = await (async () => {
            if (filePaths.has(grabCommand.setId))
              return Promise.resolve(filePaths.get(grabCommand.setId));
            const result = await dialog.showOpenDialog(browserWindow!, {
              properties: ["createDirectory", "openDirectory"],
            });
            if (result.canceled) return Promise.resolve(undefined);
            filePaths.set(grabCommand.setId, result.filePaths[0]);
            return Promise.resolve(result.filePaths[0]);
          })();
          if (!filePath) return;
          grabCommand.filename = path.join(
            filePath,
            `grab-${grabCommand.id}-${format(
              Date.now(),
              "yyyy-MM-dd-HH-mm-ss"
            )}.png`
          );
          console.log("Sending message to C#:", grabCommand);
          childProcess.stdin.write(JSON.stringify(grabCommand) + "\n");
        })();
      } else {
        console.log("Sending message to C#:", command);
        childProcess.stdin.write(JSON.stringify(command) + "\n");
      }
    });

    ipcMain.handle("GetInitialPath", () => __dirname);

    createWindow();
  });

  app.on("before-quit", () => {
    childProcess.kill();
  });

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
};

app.whenReady().then(() => {
  if (isProduction) {
    const childProcess = spawn(path.join(resourcePath, "csharp"));
    init(childProcess);
  } else {
    console.log("Building C# program...");
    const cwd = path.join(__dirname, "..", "..", "csharp");
    exec("dotnet publish worm-sem.csproj --configuration Release", { cwd }).on(
      "exit",
      () => {
        console.log("Done building C# program.");
        const childProcess = spawn(
          "./bin/Release/net7.0/wormsem",
          [], // TODO remove dry run flag when ready to connect to SEM
          { cwd }
        );
        init(childProcess);
      }
    );
  }
});
