﻿using System;
using System.Text.Json;
using wormsem.responses;

namespace wormsem.client
{
	public class ClientResponder
	{
		public static void Send(Response response) {
			String json = JsonSerializer.Serialize(response);
			Console.WriteLine(json);
        }
	}
}
