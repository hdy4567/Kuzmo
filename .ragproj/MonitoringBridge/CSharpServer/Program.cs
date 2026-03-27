using System;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Diagnostics;
using MonitoringBridge.Server.Models;
using MonitoringBridge.Server.Services;

namespace MonitoringBridge.Server
{
    /**
     * 🚀 [Clean Architecture] Program.cs
     * 입구(Entry Point) 모듈로서 서비스 부트스트래핑과 루프 관리만 담당.
     */
    class Program
    {
        private static ServiceContainer _container = new ServiceContainer();
        private static StaticFileServer _files = new StaticFileServer();
        
        public static List<WebSocket> ConnectedClients = new List<WebSocket>();
        private static readonly object _aiLock = new object();
        private static int _clientCount = 0;
        public static string LastSelectionJson { get; set; } = "{\"status\":\"none\"}";

        // Monitoring status
        public static ConcurrentDictionary<string, DateTime> LastUpdate = new ConcurrentDictionary<string, DateTime>();
        public static ConcurrentDictionary<string, bool> InputStatus = new ConcurrentDictionary<string, bool>();

        static async Task Main(string[] args)
        {
            // 🔨 1. Bootstrap Services via Container
            await _container.InitializeAsync();

            // 🚀 2. [PORT SEIZING]
            KillProcessOnPort(AppConfig.Port);

            HttpListener listener = new HttpListener();
            listener.Prefixes.Add($"http://localhost:{AppConfig.Port}/");
            listener.Prefixes.Add($"http://127.0.0.1:{AppConfig.Port}/");
            
            try { 
                listener.Start(); 
                Console.WriteLine($"✅ Port {AppConfig.Port} Seized Successfully.");
                Console.WriteLine($"🌐 MonitoringBridge Active: http://localhost:{AppConfig.Port}/");
            }
            catch (Exception ex) { Console.WriteLine($"[FATAL] {ex.Message}"); return; }

            _ = Task.Run(() => MonitoringLoop());

            // 🕸️ 3. Main Event Loop
            while (true)
            {
                try
                {
                    HttpListenerContext context = await listener.GetContextAsync();
                    if (context.Request.IsWebSocketRequest)
                    {
                        _ = ProcessWebSocket(context);
                    }
                    else
                    {
                        await _files.ServeAsync(context);
                    }
                }
                catch (Exception ex) { Console.WriteLine($"[LOOP ERROR] {ex.Message}"); }
            }
        }

        static async Task ProcessWebSocket(HttpListenerContext context)
        {
            HttpListenerWebSocketContext webSocketContext = await context.AcceptWebSocketAsync(null);
            WebSocket webSocket = webSocketContext.WebSocket;

            lock (_aiLock) { ConnectedClients.Add(webSocket); _clientCount++; }
            Console.WriteLine($"🔌 Client Connected. Total: {_clientCount}");

            try
            {
                byte[] buffer = new byte[8192];
                while (webSocket.State == WebSocketState.Open)
                {
                    var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                    if (result.MessageType == WebSocketMessageType.Close) break;

                    string message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    await _container.CommService.HandleMessage(webSocket, message);
                }
            }
            catch (Exception ex) { Console.WriteLine($"[SOCKET ERROR] {ex.Message}"); }
            finally
            {
                lock (_aiLock) { ConnectedClients.Remove(webSocket); _clientCount--; }
                if (webSocket.State != WebSocketState.Closed) 
                    await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);
                context.Response.Close();
            }
        }

        public static async Task BroadcastServerLog(string title, string region, string type = "SYSTEM")
        {
            var logPacket = new { type = "SERVER_LOG", title, region, logType = type, time = DateTime.Now.ToString("HH:mm:ss") };
            WebSocket[] clients;
            lock (_aiLock) { clients = ConnectedClients.ToArray(); }
            foreach (var client in clients) { await CommunicationService.SendJson(client, logPacket); }
        }

        static void KillProcessOnPort(int port)
        {
            try
            {
                var process = new Process();
                process.StartInfo.FileName = "cmd.exe";
                process.StartInfo.Arguments = $"/c netstat -ano | findstr :{port}";
                process.StartInfo.RedirectStandardOutput = true;
                process.StartInfo.UseShellExecute = false;
                process.StartInfo.CreateNoWindow = true;
                process.Start();
                string output = process.StandardOutput.ReadToEnd();
                process.WaitForExit();
                if (string.IsNullOrWhiteSpace(output)) return;
                var lines = output.Split(new[] { "\n" }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var line in lines)
                {
                    if (line.Contains("LISTENING"))
                    {
                        var parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                        var pid = parts.Last().Trim();
                        if (int.TryParse(pid, out int p) && p != Process.GetCurrentProcess().Id)
                        {
                            try { System.Diagnostics.Process.GetProcessById(p).Kill(); } catch { }
                        }
                    }
                }
            } catch { }
        }

        static async Task MonitoringLoop()
        {
            while (true)
            {
                foreach (var point in LastUpdate.Keys)
                {
                    if ((DateTime.Now - LastUpdate[point]).TotalSeconds > 2.0) InputStatus[point] = false;
                }
                await Task.Delay(1000);
            }
        }
    }
}
