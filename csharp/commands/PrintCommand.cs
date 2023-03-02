using System;
using wormsem.responses;

namespace wormsem.commands
{
    public class PrintCommand : Command
    {
        private String text;

        public PrintCommand(int id, String text) : base(id)
        {
            this.text = text;
        }

        public override Response Execute()
        {
            return new SuccessResponse(id, "Successfully executed PrintCommand: " + text);
        }
    }
}

