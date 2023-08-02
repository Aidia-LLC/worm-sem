using System;
using wormsem.api;
using wormsem.responses;

namespace wormsem.commands
{
	public class SetParamCommand : Command
	{
        private string param;
        private int? intValue;
        private double? doubleValue;

        public SetParamCommand(int id, string param, int? intValue, double? doubleValue) : base(id)
        {
            this.param = param;
            this.intValue = intValue;
            this.doubleValue = doubleValue;
        }

        public override Response Execute(SEMApi api)
        {
            try
            {
                if (intValue == null)
                    api.SetParam(param, (double)doubleValue!);
                else
                    api.SetParam(param, (int)intValue);
                return new SuccessResponse(id, "Successfully set param " + param, SuccessCode.SET_PARAM_SUCCESS, param + "=");
            }
            catch (Exception err)
            {
                return new ErrorResponse(id, ErrorCode.FAILED_TO_SET_PARAM, err.ToString());
            }
        }
    }
}

