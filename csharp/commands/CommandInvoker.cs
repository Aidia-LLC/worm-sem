using System.Text.Json;
using wormsem.responses;
using wormsem.client;
using wormsem.api;

namespace wormsem.commands
{
    public class CommandInvoker
    {
        private Queue<Command> commands = new Queue<Command>();
        private Thread? thread = null;
        private SEMApi api;

        public CommandInvoker(Boolean dryRun)
        {
            api = dryRun ? new TestSEMApi() : new ActualApi();
        }

        public void QueueCommand(Command command)
        {
            lock (commands)
            {
                commands.Enqueue(command);
            }
        }

        public void Start()
        {
            if (thread != null) return;
            thread = new Thread(() =>
            {
                while (true)
                {
                    lock (commands)
                    {
                        while (commands.Count > 0)
                        {
                            Command nextCommand = commands.Dequeue();
                            Response response = nextCommand.Execute(api);
                            ClientResponder.Send(response);
                        }
                    }
                    Thread.Sleep(100);
                }
            });
            thread.Start();
        }
    }
}
