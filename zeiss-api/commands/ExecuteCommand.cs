using System;
using wormsem.api;
using wormsem.responses;

namespace wormsem.commands
{
    public class ExecuteCommand : Command
    {
        private string command;

        public ExecuteCommand(int id, string command) : base(id)
        {
            this.command = command;
        }

        public override Response Execute(SEMApi api)
        {
            try
            {
                api.ExecuteCommand(command);
                return new SuccessResponse(id, "Successfully executed command: " + command, SuccessCode.EXEUTE_COMMAND_SUCCESS);
            }
            catch (Exception err)
            {
                return new ErrorResponse(id, ErrorCode.FAILED_TO_EXECUTE_COMMAND, err.ToString());
            }
        }
    }
}

