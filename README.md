# Worm SEM

This project is composed of two parts:

1. A standalone C# CLI program that interfaces with the microscope through the ActiveX API.
2. An Electron app that processes the images and displays the results.

The two programs send JSON messages via stdin and stdout. The Electron app is responsible for starting the CLI program and reading its output. In the development environment, the Electron app also builds the CLI program at startup.

## Running the CLI program

Install `dotnet`. Navigate to the `csharp` directory and run `dotnet run`. The program will start and wait for commands.

You can use the command line argument `--dry-run` to skip the microscope connection and just return a success response for every command.

## Running the Electron app

Install `node`. Navigate to the `app` directory and run `yarn`. Then run `yarn dev`. The app will start and connect to the CLI program.

## Unknowns

- [ ] Testing when frame freezes
- [ ] Moving the stage
- [ ] Changing the magnification
- [ ] Scale of brightness, contrast, and working distance (sliders have hard-coded limits)
