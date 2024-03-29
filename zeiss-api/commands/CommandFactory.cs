﻿using System;
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
                case "CONNECT":
                    return new ConnectCommand(id);
                case "SET_PARAM":
                    if (serializedCommand.param == null)
                        throw new Exception("expecting param");
                    if (serializedCommand.intValue != null)
                        return new SetParamCommand(id, serializedCommand.param, serializedCommand.intValue, null);
                    if (serializedCommand.doubleValue != null)
                        return new SetParamCommand(id, serializedCommand.param, null, serializedCommand.doubleValue);
                    throw new Exception("expecting value");
                case "GET_PARAM":
                    if (serializedCommand.param == null)
                        throw new Exception("expecting param");
                    return new GetParamCommand(id, serializedCommand.param);
                case "EXECUTE":
                    if (serializedCommand.command == null)
                        throw new Exception("expecing command");
                    return new ExecuteCommand(id, serializedCommand.command);
                case "GRAB":
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
                case "GRAB_FULL_FRAME":
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
