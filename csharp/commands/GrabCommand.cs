using System;
using wormsem.responses;
using wormsem.api;
using static wormsem.api.SEMApi;

namespace wormsem.commands
{
    public class GrabCommand : Command
    {
        private string name;
        private string filename;
        private short x;
        private short y;
        private short width;
        private short height;
        private int reduction;

        public GrabCommand(int id, string name, string filename, short x, short y, short width, short height, int reduction) : base(id)
        {
            this.name = name;
            this.filename = filename;
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
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
                api.Grab(name, filename, x, y, width, height, r);
                return new SuccessResponse(id, "Successfully grabbed frame.", SuccessCode.GRAB_SUCCESS, filename);
            }
            catch (Exception err)
            {
                return new ErrorResponse(id, ErrorCode.FAILED_TO_GRAB, err.ToString());
            }
        }
    }
}

