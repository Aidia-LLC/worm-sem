using System;
using wormsem.responses;
using wormsem.api;

namespace wormsem.commands
{
    public class ConnectCommand : Command
    {
        public ConnectCommand(int id) : base(id)
        { }

        public override Response Execute(SEMApi api)
        {
            try
            {
                api.Connect();
                return new SuccessResponse(id, "Successfully connected!");
            }
            catch (Exception e)
            {
                return new ErrorResponse(id, ErrorCode.FAILED_TO_CONNECT, "Failed to connect to API. " + e.ToString());
            }
        }
    }
}
