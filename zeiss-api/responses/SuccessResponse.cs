using System;
namespace wormsem.responses
{
    public enum SuccessCode
    {
        GRAB_SUCCESS = 200,
        CONNECT_SUCCESS = 201,
        ECHO_SUCCESS = 202,
        SET_PARAM_SUCCESS = 203,
        GET_PARAM_SUCCESS = 204,
        EXEUTE_COMMAND_SUCCESS = 205
    }

    public class SuccessResponse : Response
    {
        public SuccessResponse(int id, String message, SuccessCode code, object? payload = null)
        {
            this.id = id;
            this.message = message;
            this.payload = payload;
            this.code = (int)code;
            type = "SUCCESS";
        }
    }
}
