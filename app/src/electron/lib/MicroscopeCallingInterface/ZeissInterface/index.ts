import { ElectronMessage } from "@electron/types";
import appRootDir from "app-root-dir";
import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import { app } from "electron";
import fs from "fs";
import path from "path";
import { MicroscopeCallingInterface } from "..";
import { getPlatform } from "../../platform";
import {
  MicroscopeDetectorType,
  MicroscopeFreezeOn,
  MicroscopeImageQuality,
} from "../types";
import type { ZeissMessage } from "./types";

// @ts-expect-error
import isSquirrelStartup from "electron-squirrel-startup";

if (isSquirrelStartup) app.quit();

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const isProduction = app.isPackaged;
const isLinux = getPlatform() === "linux";
const RESPONSE_TIMEOUT = 10_000;

const DETECTOR_TYPE_STEM_A_ZOOMED_IN = 40;
const DETECTOR_TYPE_STEM_B_ZOOMED_IN = 41;
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
  private messageId = 1;
  private responseCallbacks: Map<
    number,
    {
      onSuccess: (message: ZeissMessage) => void;
      onError: (message: ZeissMessage) => void;
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
  ): Promise<ZeissMessage> {
    const child = this.childProcess;
    if (!child)
      throw new Error(
        "Attempted to send message to microscope before initialization"
      );
    return new Promise((res, rej) => {
      const msg = JSON.stringify(message);
      console.log("Sending message", msg);
      child.stdin.write(msg + "\n");
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
    const [_, value] = (response.payload || "").split("=");
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

  override async getStageBounds(): Promise<{
    x: { min: number; max: number };
    y: { min: number; max: number };
  }> {
    const stageLowLimitX = await this.getZeissParam("AP_STAGE_LOW_X");
    const stageLowLimitY = await this.getZeissParam("AP_STAGE_LOW_Y");
    const stageHighLimitX = await this.getZeissParam("AP_STAGE_HIGH_X");
    const stageHighLimitY = await this.getZeissParam("AP_STAGE_HIGH_Y");
    return {
      x: {
        min: parseFloat(stageLowLimitX),
        max: parseFloat(stageHighLimitX),
      },
      y: {
        min: parseFloat(stageLowLimitY),
        max: parseFloat(stageHighLimitY),
      },
    };
  }

  override async setDetectorType(
    detectorType: MicroscopeDetectorType
  ): Promise<void> {
    switch (detectorType) {
      case "ZOOMED_IN_A":
        await this.setZeissParam(
          "DP_DETECTOR_TYPE",
          DETECTOR_TYPE_STEM_A_ZOOMED_IN
        );
        break;
      case "ZOOMED_IN_B":
        await this.setZeissParam(
          "DP_DETECTOR_TYPE",
          DETECTOR_TYPE_STEM_B_ZOOMED_IN
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

  async moveAxis(p: {
    axis: "R" | "X" | "Y";
    position: number;
  }): Promise<void> {
    const param = `AP_STAGE_GOTO_${p.axis}`;
    let currentPosition = await this.getZeissParam(param);
    await this.setZeissParam(param, p.position);
    do {
      await sleep(100);
      currentPosition = await this.getZeissParam(param);
    } while (Math.abs(currentPosition - p.position) / p.position > 0.01);
    await sleep(500);
  }

  override async moveStageTo(position: {
    x: number;
    y: number;
    r?: number | undefined;
  }): Promise<void> {
    await sleep(10);
    const r = position.r;
    if (r) {
      await this.moveAxis({ axis: "R", position: r });
    }
    await this.moveAxis({ axis: "X", position: position.x });
    await this.moveAxis({ axis: "Y", position: position.y });
  }

  override async getFieldOfView(): Promise<{ width: number; height: number }> {
    const width = await this.getZeissParam("AP_WIDTH");
    const height = await this.getZeissParam("AP_HEIGHT");
    return { width: parseFloat(width), height: parseFloat(height) };
  }

  override async getStagePosition(): Promise<{
    x: number;
    y: number;
    r: number;
  }> {
    const x = await this.getZeissParam("AP_STAGE_AT_X");
    const y = await this.getZeissParam("AP_STAGE_AT_Y");
    const r = await this.getZeissParam("AP_STAGE_AT_R");
    return { x: parseFloat(x), y: parseFloat(y), r: parseFloat(r) };
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

  override async autoBrightnessAndContrast(): Promise<void> {
    await this.sendZeissCommand(`CMD_ABC`);
    await sleep(100);
  }

  override async autoFocusCoarse(): Promise<void> {
    await this.sendZeissCommand(`CMD_AUTO_FOCUS_COARSE`);
    await sleep(100);
  }

  override async autoFocusFine(): Promise<void> {
    await this.sendZeissCommand(`CMD_AUTO_FOCUS_FINE`);
    await sleep(100);
  }

  override async grabFullFrame(
    name: string,
    filename: string
  ): Promise<ElectronMessage> {
    const response = await this.sendMessage({
      id: this.messageId++,
      type: "GRAB_FULL_FRAME",
      reduction: -1,
      name,
      filename,
    });
    return {
      id: response.id,
      code: response.code,
      payload: response.payload,
      filename,
      type: "SUCCESS",
    };
  }

  public override async initialize() {
    return new Promise<void>((res, rej) => {
      const handleSpawned = (child: ChildProcessWithoutNullStreams) => {
        this.childProcess = child;
        child.stdout.on("data", (data: Buffer) => {
          const messages: ElectronMessage[] = data
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
            console.log(
              "Received message from Zeiss interface:",
              JSON.stringify(message)
            );
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
            if (message.type === "ERROR") callbacks.onError(message);
            else callbacks.onSuccess(message);
          });
        });

        child.stderr.on("data", (data: Buffer) => {
          console.error(data.toString("utf8"));
        });
      };

      if (isProduction || isLinux) {
        const childProcess = spawn(path.join(resourcePath, "zeiss-api"), [
          "--dry-run",
        ]);
        childProcess.on("spawn", () => {
          console.log("child process spawned");
          handleSpawned(childProcess);
          res();
        });
      } else {
        console.log("Building Zeiss interface...");
        const cwd = path.join(__dirname, "..", "..", "zeiss-api");
        exec("dotnet publish worm-sem.csproj --configuration Release", {
          cwd,
        }).on("exit", (e) => {
          if (e !== 0) rej(`Failed to build Zeiss interface. Error: ${e}`);
          console.log("Done building Zeiss interface.");
          const executablePath = path.join(
            ".",
            "bin",
            "release",
            "net7.0",
            "wormsem"
          );
          console.log(executablePath);
          const childProcess = spawn(
            executablePath,
            this.dryRun ? ["--dry-run"] : [],
            { cwd }
          );
          childProcess.on("spawn", () => {
            console.log("child process spawned");
            handleSpawned(childProcess);
            res();
          });
        });
      }
    });
  }

  public override async connect(): Promise<void> {
    await this.sendMessage({
      id: this.messageId++,
      type: "CONNECT",
    });
  }

  public override shutdown() {
    this.childProcess?.kill();
  }
}
