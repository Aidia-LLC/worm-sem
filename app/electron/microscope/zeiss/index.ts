import appRootDir from "app-root-dir";
import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import { app } from "electron";
import { getPlatform } from "electron/platform";
import fs from "fs";
import path from "path";
import { Message } from "src/microscopeApi/types";
import { MicroscopeCallingInterface } from "..";
import {
  MicroscopeDetectorType,
  MicroscopeFreezeOn,
  MicroscopeImageQuality,
} from "../types";

const isProduction = app.isPackaged;
const isLinux = getPlatform() === "linux";
const RESPONSE_TIMEOUT = 10_000;

const DETECTOR_TYPE_STEM_A_ZOOMED_IN = 40;
const DETECTOR_TYPE_STEM_D_ZOOMED_OUT = 43;
const LOW_IMAGE_QUALITY = 4;
const MEDIUM_IMAGE_QUALITY = 5;
const HIGH_IMAGE_QUALITY = 7;

export const resourcePath =
  isProduction && !isLinux
    ? path.join(path.dirname(appRootDir.get()), "bin")
    : path.join(appRootDir.get(), "resources", getPlatform());

export class ZeissInterface extends MicroscopeCallingInterface {
  private dryRun: boolean;
  private childProcess: ChildProcessWithoutNullStreams | null = null;
  private messageId = 2;
  private responseCallbacks: Map<
    number,
    {
      onSuccess: (message: Message) => void;
      onError: (message: Message) => void;
    }
  > = new Map();

  constructor(options?: { dryRun?: boolean }) {
    super();
    this.dryRun = Boolean(options?.dryRun);
  }

  private sendMessage(
    message: {
      id: number;
    } & Record<string, any>
  ): Promise<Message> {
    const child = this.childProcess;
    if (!child)
      throw new Error(
        "Attempted to send message to microscope before initialization"
      );
    return new Promise((res, rej) => {
      child.stdin.write(JSON.stringify(message) + "\n");
      setTimeout(rej, RESPONSE_TIMEOUT);
      this.responseCallbacks.set(message.id, {
        onSuccess: res,
        onError: rej,
      });
    });
  }

  private async getZeissParam(param: string) {
    const response = await this.sendMessage({
      id: this.messageId++,
      type: "GET_PARAM",
      param,
    });
    if (!response.payload) throw new Error("No payload in response");
    const [_, value] = response.payload.split("=");
    return value;
  }

  private async setZeissParam(param: string, value: number) {
    await this.sendMessage({
      id: this.messageId++,
      type: "SET_PARAM",
      param,
      doubleValue: value,
    });
  }

  private async sendZeissCommand(command: string) {
    await this.sendMessage({
      id: this.messageId++,
      type: "EXECUTE",
      command,
    });
  }

  override async getMagnification() {
    const value = await this.getZeissParam("AP_MAG");
    return parseFloat(value);
  }

  override async setMagnification(mag: number) {
    await this.setZeissParam("AP_MAG", mag);
  }

  override async getBrightness() {
    const value = await this.getZeissParam("AP_BRIGHTNESS");
    return parseFloat(value);
  }

  override async setBrightness(brightness: number) {
    await this.setZeissParam("AP_BRIGHTNESS", brightness);
  }

  override async getContrast() {
    const value = await this.getZeissParam("AP_CONTRAST");
    return parseFloat(value);
  }

  override async setContrast(contrast: number) {
    await this.setZeissParam("AP_CONTRAST", contrast);
  }

  override async getWorkingDistance() {
    const value = await this.getZeissParam("AP_WD");
    return parseFloat(value);
  }

  override async setWorkingDistance(workingDistance: number) {
    await this.setZeissParam("AP_WD", workingDistance);
  }

  override async setScanSpeed(scanSpeed: number): Promise<void> {
    await this.sendZeissCommand(`CMD_SCANRATE${scanSpeed}`);
  }

  override async setDetectorType(
    detectorType: MicroscopeDetectorType
  ): Promise<void> {
    switch (detectorType) {
      case "ZOOMED_IN":
        await this.setZeissParam(
          "DP_DETECTOR_TYPE",
          DETECTOR_TYPE_STEM_A_ZOOMED_IN
        );
        break;
      case "ZOOMED_OUT":
        await this.setZeissParam(
          "DP_DETECTOR_TYPE",
          DETECTOR_TYPE_STEM_D_ZOOMED_OUT
        );
        break;
    }
  }

  override async setImageQuality(
    imageQuality: MicroscopeImageQuality
  ): Promise<void> {
    const quality = (() => {
      switch (imageQuality) {
        case "LOW":
          return LOW_IMAGE_QUALITY;
        case "MEDIUM":
          return MEDIUM_IMAGE_QUALITY;
        case "HIGH":
          return HIGH_IMAGE_QUALITY;
      }
    })();
    await this.setZeissParam("DP_IMAGE_STORE", quality);
  }

  override async moveStageTo(position: {
    x: number;
    y: number;
  }): Promise<void> {
    await this.setZeissParam("AP_STAGE_GOTO_X", position.x);
    await this.setZeissParam("AP_STAGE_GOTO_Y", position.y);
  }

  override async getFieldOfView(): Promise<{ width: number; height: number }> {
    const width = await this.getZeissParam("AP_WIDTH");
    const height = await this.getZeissParam("AP_HEIGHT");
    return { width: parseFloat(width), height: parseFloat(height) };
  }

  override async getStagePosition(): Promise<{ x: number; y: number }> {
    const x = await this.getZeissParam("AP_STAGE_AT_X");
    const y = await this.getZeissParam("AP_STAGE_AT_Y");
    return { x: parseFloat(x), y: parseFloat(y) };
  }

  override async getFrozen(): Promise<boolean> {
    const value = await this.getZeissParam("DP_FROZEN");
    return value === "1";
  }

  override async setFrozen(frozen: boolean): Promise<void> {
    await this.setZeissParam("DP_FROZEN", frozen ? 1 : 0);
  }

  override async setFreezeOn(freezeOn: MicroscopeFreezeOn): Promise<void> {
    const value = (() => {
      switch (freezeOn) {
        case "END_FRAME":
          return 0;
        case "COMMAND":
          return 2;
      }
    })();
    await this.setZeissParam("DP_FREEZE_ON", value);
  }

  override async grabFullFrame(
    name: string,
    filename: string
  ): Promise<Message> {
    return this.sendMessage({
      id: this.messageId++,
      type: "GRAB_FULL_FRAME",
      reduction: -1,
      name,
      filename,
    });
  }

  private async spawnChildProcess(): Promise<ChildProcessWithoutNullStreams> {
    return new Promise((res, rej) => {
      if (isProduction || isLinux) {
        const childProcess = spawn(path.join(resourcePath, "zeiss-api"), [
          "--dry-run",
        ]);
        res(childProcess);
      } else {
        console.log("Building Zeiss interface...");
        const cwd = path.join(__dirname, "..", "..", "zeiss-api");
        exec("dotnet publish worm-sem.csproj --configuration Release", {
          cwd,
        }).on("exit", (e) => {
          if (e !== 0) rej("Failed to build Zeiss interface.");
          console.log("Done building Zeiss interface.");
          const childProcess = spawn(
            path.join(".", "bin", "release", "net7.0", "wormsem"),
            this.dryRun ? ["--dry-run"] : [],
            { cwd }
          );
          res(childProcess);
        });
      }
    });
  }

  public override async initialize() {
    const child = await this.spawnChildProcess();
    this.childProcess = child;
    child.on("spawn", () => {
      child.stdout.on("data", (data: Buffer) => {
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
        messages.forEach(async (message) => {
          console.log("Received message from Zeiss interface:", message);
          const callbacks = this.responseCallbacks.get(message.id);
          if (!callbacks) return;
          this.responseCallbacks.delete(message.id);
          if (message.code === 200) {
            // grab success
            const payload = message.payload;
            if (!payload) return;
            if (payload.endsWith("setup.tiff")) {
              // this is a temporary file just used to make the user choose a folder before waiting for the first image to be taken
              await fs.promises.rm(payload);
              message = {
                ...message,
                payload: "",
              };
            } else {
              const data = await fs.promises.readFile(payload);
              message = {
                ...message,
                payload: Buffer.from(data).toString("base64"),
                filename: payload,
              };
            }
          }
          if (message.type === "error") callbacks.onError(message);
          else callbacks.onSuccess(message);
        });
      });

      child.stderr.on("data", (data: Buffer) => {
        console.error(data.toString("utf8"));
      });
    });
  }

  public override shutdown() {
    this.childProcess?.kill();
  }
}
