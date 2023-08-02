using wormsem.commands;
using wormsem.responses;

namespace wormsem.client
{
    public class ClientListener
    {
        private Thread? thread = null;
        private CommandInvoker invoker;
        private CommandFactory factory;

        public ClientListener(CommandInvoker invoker)
        {
            this.invoker = invoker;
            factory = new CommandFactory();
        }

        public void Start()
        {
            if (thread != null) return;

            thread = new Thread(() =>
            {
                while (true)
                {
                    try
                    {
                        String? line = Console.ReadLine();
                        if (line == null || line == "") continue;
                        Command command = factory.Create(line);
                        invoker.QueueCommand(command);
                    }
                    catch (Exception e)
                    {
                        ClientResponder.Send(new ErrorResponse(-1, ErrorCode.JSON_DECODE, "Unable to decode JSON. " + e.ToString()));
                    }
                }
            });
            thread.Start();
        }
    }
}
