using System;
using System.Text.Json;
using wormsem.api;
using static wormsem.api.SEMApi;

namespace wormsem.commands
{
    public class CommandFactory
    {

        public Command Create(String json)
        {
            var serializedCommand = JsonSerializer.Deserialize<SerializedCommand>(json);
            var nullableId = serializedCommand?.id;
            if (nullableId == null)
                throw new Exception("Missing id in command");
            int id = (int)nullableId;
            switch (serializedCommand?.type)
            {
                case "echo":
                    if (serializedCommand.message == null)
                        throw new Exception("Expecting string value");
                    return new EchoCommand(id, serializedCommand.message);
                case "grab":
                    {
                        if (serializedCommand.x == null || serializedCommand.y == null || serializedCommand.width == null || serializedCommand.height == null)
                            throw new Exception("Expecting x, y, width, and height");
                        if (serializedCommand.name == null || serializedCommand.filename == null)
                            throw new Exception("Expecting name and filename");
                        short reduction = serializedCommand.reduction == null ? (short)Reduction.OVERLAY_PLANE : (short)serializedCommand.reduction;
                        return new GrabCommand(
                            id,
                            serializedCommand.name,
                            serializedCommand.filename,
                            (short)serializedCommand.x,
                            (short)serializedCommand.y,
                            (short)serializedCommand.width,
                            (short)serializedCommand.height,
                            reduction
                        );
                    }
                case "grabFullFrame":
                    {
                        if (serializedCommand.name == null || serializedCommand.filename == null)
                            throw new Exception("Expecting name and filename");
                        short reduction = serializedCommand.reduction == null ? (short)Reduction.OVERLAY_PLANE : (short)serializedCommand.reduction;
                        return new GrabFullFrameCommand(
                            id,
                            serializedCommand.name,
                            serializedCommand.filename,
                            reduction
                        );
                    }
                default:
                    throw new Exception("Invalid command received: '" + serializedCommand?.type + "'");
            }
        }
    }
}
