using wormsem.api;
using wormsem.client;
using wormsem.responses;
using wormsem.commands;

Boolean dryRun = args.Any((String arg) =>
{
    return arg.Equals("--dry-run");
});

CommandInvoker invoker = new CommandInvoker(dryRun);
invoker.Start();

ClientListener listener = new ClientListener(invoker);
listener.Start();

ClientResponder.Send(new ReadyResponse());
