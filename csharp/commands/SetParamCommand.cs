using System;
using wormsem.api;
using wormsem.responses;

namespace wormsem.commands
{
	public class SetParamCommand : Command
	{
        private string param;
        private int value;

        public SetParamCommand(int id, string param, int value) : base(id)
        {
            this.param = param;
            this.value = value;
        }

        public override Response Execute(SEMApi api)
        {
            try
            {
                api.SetParam(param, value);
                return new SuccessResponse(id, "Successfully set param " + param + " to " + value, SuccessCode.SET_PARAM_SUCCESS, param + "=" + value);
            }
            catch (Exception err)
            {
                return new ErrorResponse(id, ErrorCode.FAILED_TO_SET_PARAM, err.ToString());
            }
        }
    }
}

