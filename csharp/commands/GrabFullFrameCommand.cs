using System;
using wormsem.responses;
using wormsem.api;
using static wormsem.api.SEMApi;

namespace wormsem.commands
{
    public class GrabFullFrameCommand : Command
    {
        private string name;
        private string filename;
        private int reduction;

        public GrabFullFrameCommand(int id, string name, string filename, int reduction) : base(id)
        {
            this.name = name;
            this.filename = filename;
            this.reduction = reduction;
        }

        public override Response Execute(SEMApi api)
        {
            Reduction r;
            try
            {
                r = (Reduction)reduction;
            }
            catch
            {
                return new ErrorResponse(id, ErrorCode.INVALID_REDUCTION_VALUE, "Unable to convert '" + reduction + "' to a reduction value. Must be an integer in [-1, 3]");
            }
            try
            {
                api.GrabFullFrame(name, filename, r);
                return new SuccessResponse(id, "Successfully grabbed full frame.");
            }
            catch (Exception err)
            {
                return new ErrorResponse(id, ErrorCode.FAILED_TO_GRAB, err.ToString());
            }
        }
    }
}

