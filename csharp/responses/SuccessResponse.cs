using System;
namespace wormsem.responses
{
    public class SuccessResponse : Response
    {
        public SuccessResponse(int id, String message)
        {
            this.id = id;
            this.message = message;
            type = "success";
        }
    }
}
