# Worm SEM

This project is composed of two parts:

1. A standalone C# CLI program that interfaces with the microscope through the ActiveX API.
2. An Electron app that processes the images and displays the results.

The two programs send JSON messages via stdin and stdout. The Electron app is responsible for starting the CLI program and reading its output. In the development environment, the Electron app also builds the CLI program at startup.

## Setting up Segment Anything Model

- Install Python 3.9 (not the latest version)
- `pip3 install flask flask-cors opencv-python pycocotools matplotlib onnxruntime onnx`
- Download the `default` model checkpoint from `https://github.com/facebookresearch/segment-anything#model-checkpoints` and place it in the `python` directory. It should be named `sam_vit_h_4b8939.pth`.

## Running the CLI program

Install `dotnet`. Navigate to the `csharp` directory and run `dotnet run`. The program will start and wait for commands.

You can use the command line argument `--dry-run` to skip the microscope connection and just return a success response for every command.

## Running the Electron app

Install `node`. Navigate to the `app` directory and run `yarn`. Then run `yarn dev`. The app will start and connect to the CLI program.

## TODO

- [ ] Moving the stage
- [ ] High magnification
- [ ] Focus
- [ ] Interpolation of slice configuration (brightness, contrast, focus)
- [ ] Scale of brightness, contrast, and working distance. May need to adjust to allow using arrow keys and having proper increments (very small, maybe 0.01)
- [ ] Maybe change device to `cuda` in the Python server to allow hardware acceleration
