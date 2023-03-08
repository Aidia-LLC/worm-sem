using System;
using wormsem.responses;
using wormsem.api;

namespace wormsem.commands
{
    public class EchoCommand : Command
    {
        private String text;

        public EchoCommand(int id, String text) : base(id)
        {
            this.text = text;
        }

        public override Response Execute(SEMApi api)
        {
            return new SuccessResponse(id, text);
        }
    }
}
