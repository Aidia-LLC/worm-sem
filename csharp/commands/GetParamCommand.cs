using System;
using wormsem.api;
using wormsem.responses;

namespace wormsem.commands
{
    public class GetParamCommand : Command
    {
        private string param;

        public GetParamCommand(int id, string param) : base(id)
        {
            this.param = param;
        }

        public override Response Execute(SEMApi api)
        {
            try
            {
                object response = api.GetParam(param);
                if (response is String)
                {
                    if (((string)response).Equals("Live"))
                    {
                        return new SuccessResponse(id, "Successfully got param " + param, SuccessCode.GET_PARAM_SUCCESS, param + "=0");
                    } else if (((string)response).Equals("Frozen"))
                    {
                        return new SuccessResponse(id, "Successfully got param " + param, SuccessCode.GET_PARAM_SUCCESS, param + "=1");
                    }
                }
                return new SuccessResponse(id, "Successfully got param " + param, SuccessCode.GET_PARAM_SUCCESS, param + "=" + response);
            }
            catch (Exception err)
            {
                return new ErrorResponse(id, ErrorCode.FAILED_TO_GET_PARAM, err.ToString());
            }
        }
    }
}

