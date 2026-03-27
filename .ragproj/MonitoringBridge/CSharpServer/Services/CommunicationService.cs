using System;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;
using MonitoringBridge.Server.Services.Map;

namespace MonitoringBridge.Server.Services
{
    public class CommunicationService
    {
        private readonly KnowledgeEngine _knowledge;
        private readonly PersonalMemoryManager _memory;
        private readonly MoERouter _router;
        private readonly AIIntelligenceSentinel _sentinel;
        private readonly IAiService _gemini;

        public CommunicationService(
            KnowledgeEngine knowledge, 
            PersonalMemoryManager memory, 
            MoERouter router, 
            AIIntelligenceSentinel sentinel, 
            IAiService gemini)
        {
            _knowledge = knowledge;
            _memory = memory;
            _router = router;
            _sentinel = sentinel;
            _gemini = gemini;
        }

        public async Task HandleMessage(WebSocket webSocket, string message)
        {
            if (string.IsNullOrEmpty(message)) return;

            try
            {
                // 🚀 [MoE-ROUTING] Route query to experts
                var experts = _router.Route(message);
                var primaryExpert = experts[0];

                // 🧠 [CONTEXT-RETRIEVAL] Get personal context
                string personalContext = _memory.GetRelevantContext(message);
                
                // 📡 [AI-ORCHESTRATION] Build unified prompt
                string systemPrompt = $"[Expert: {primaryExpert.Persona}]\n[Style: {primaryExpert.Style}]\n[Context: {personalContext}]\nUser Query: {message}";

                await foreach (var chunk in _gemini.InferStreaming(systemPrompt))
                {
                    // 🛡️ [SENTINEL-REINFORCE] Self-healing chunk processing
                    string reinforced = _sentinel.ReinforceChunk(chunk, "");
                    await SendJson(webSocket, new { type = "AI_RESPONSE", chunk = reinforced });
                }

                await SendJson(webSocket, new { type = "AI_DONE" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[COMM-ERR] {ex.Message}");
                await SendJson(webSocket, new { type = "AI_ERROR", message = "지능 처리 중 오류 발생" });
            }
        }

        public static async Task SendJson(WebSocket socket, object obj)
        {
            if (socket.State != WebSocketState.Open) return;
            var json = System.Text.Json.JsonSerializer.Serialize(obj);
            var buffer = System.Text.Encoding.UTF8.GetBytes(json);
            await socket.SendAsync(new ArraySegment<byte>(buffer), WebSocketMessageType.Text, true, CancellationToken.None);
        }

        public async Task StartListeningAsync(WebSocket webSocket, CancellationToken ct)
        {
            var buffer = new byte[8192];
            while (webSocket.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                if (result.MessageType == WebSocketMessageType.Close) break;

                string message = System.Text.Encoding.UTF8.GetString(buffer, 0, result.Count);
                await HandleMessage(webSocket, message);
            }
        }
    }
}
