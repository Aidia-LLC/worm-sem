using SmartSEMImaging;
using wormsem.invoker;
using wormsem.client;
using wormsem.responses;

ClientResponder responder = new ClientResponder();

SEMInvoker invoker = new SEMInvoker(responder);
invoker.Start();

ClientListener listener = new ClientListener(invoker);
listener.Start();

responder.Send(new ReadyResponse());
