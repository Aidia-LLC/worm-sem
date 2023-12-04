# Worm SEM

This project is composed of three parts:

1. An Electron app. This is the UI, and it also processes the images and displays the results.
2. A standalone C# CLI program that acts as the Zeiss API.
3. A Python Flask server that runs the Segment Anything Model.

The Electron app is the main point of entry. It spins up processes for the other two programs.

## Setting up the Segment Anything Model

- Install Python 3.9 (not the latest version)
- Install dependencies with `pip3 install flask flask-cors opencv-python pycocotools matplotlib onnxruntime onnx torch torchvision`
- Install Segment Anything with `pip3 install git+https://github.com/facebookresearch/segment-anything.git`
- Download the `default` model checkpoint from `https://github.com/facebookresearch/segment-anything#model-checkpoints` and place it in the `mask-server` directory. It should be named `sam_vit_h_4b8939.pth`.

## Running the Zeiss API

Install `dotnet`.

For development purposes, you can run the API as a standalone program by navigating to the `zeiss-api` directory and running `dotnet run`. The program will start and wait for commands through `stdin`.

You can use the command line argument `--dry-run` to skip the microscope connection and just return a success response for every command.

## Building the Zeiss API

To build the C# program as a standalone executable, you should just be able to run `yarn zeiss:build:windows` from the `app` directory. If that doesn't work, you can manually follow these steps:

Navigate to the `zeiss-api` directory and run:

```
dotnet publish -p:PublishSingleFile=true worm-sem.csproj --configuration Release --self-contained true
```

Move the `zeiss-api/bin/Release/net7.0/publish/wormsem` executable to the `app/resources/win` folder. Rename the executable to `zeiss-api`. You shouldn't need any of the `dll` files, but if it doesn't work you can try copying them over as well.

## Running the Electron app

Install `node`. Navigate to the `app` directory and run `yarn`. Then run `yarn start`. The app will start in development mode and connect to the CLI program.

## Building the Electron app

You should be able to build a standalone app by running `yarn zeiss:build:windows && yarn build` from the `app` directory.
