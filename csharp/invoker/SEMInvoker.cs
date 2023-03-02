using System.Text.Json;
using wormsem.commands;
using wormsem.responses;
using wormsem.client;

namespace wormsem.invoker
{
    public class SEMInvoker
    {
        private Queue<Command> commands = new Queue<Command>();
        private Thread? thread = null;

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
                            Response response = nextCommand.Execute();
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
