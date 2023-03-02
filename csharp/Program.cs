using wormsem.invoker;
using wormsem.client;
using wormsem.responses;

SEMInvoker invoker = new SEMInvoker();
invoker.Start();

ClientListener listener = new ClientListener(invoker);
listener.Start();

ClientResponder.Send(new ReadyResponse());
