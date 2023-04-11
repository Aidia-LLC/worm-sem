using System;
namespace wormsem.responses
{
    public enum SuccessCode
    {
        GRAB_SUCCESS = 200,
        CONNECT_SUCCESS = 201,
        ECHO_SUCCESS = 202
    }

    public class SuccessResponse : Response
    {
        public SuccessResponse(int id, String message, SuccessCode code, String? payload = null)
        {
            this.id = id;
            this.message = message;
            this.payload = payload;
            this.code = (int)code;
            type = "success";
        }
    }
}
