using wormsem.invoker;
using wormsem.commands;

namespace wormsem.client
{
    public class ClientListener
    {
        private Thread? thread = null;
        private SEMInvoker invoker;
        private CommandFactory factory;

        public ClientListener(SEMInvoker invoker)
        {
            this.invoker = invoker;
            factory = new CommandFactory();
        }

        public void Start()
        {
            if (thread != null) return;

            thread = new Thread(() => {
                while (true)
                {
                    try
                    {
                        String? line = Console.ReadLine();
                        if (line == null || line == "") continue;
                        Command command = factory.Create(line);
                        invoker.QueueCommand(command);
                    } catch (Exception e) {
                        Console.WriteLine("Caught exception in ClientListener: " + e.ToString());
                    }
                }
            });
            thread.Start();
        }
    }
}
