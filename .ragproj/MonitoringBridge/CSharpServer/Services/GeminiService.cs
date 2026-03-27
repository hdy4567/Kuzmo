using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Linq;
using MonitoringBridge.Server.Models;

namespace MonitoringBridge.Server.Services
{
    /**
     * 🚀 [GEMINI-SERVICE] Cloud-based AI Orchestration Layer (v22.50)
     * Exclusive implementation for the absolute latest Google Gemini PRO engine.
     * v22.50: Full Logic Audit & Premium Locking 완료.
     */
    public class GeminiService : IAiService
    {
        /* 🚨 [CRITICAL: MODEL_LOCK] ----------------------------------------------------
         * 이 모델명은 시스템 인텔리전스 지표(AQC)의 기준점입니다. 
         * '1.5-pro-latest'는 현재 Pro 티어 중 가장 지능이 높고 최신인 버전입니다.
         * 절대 임의로 변경하지 마십시오. (Change request required for upgrade)
         */
        private const string PRIMARY_MODEL = "gemini-1.5-pro-latest";
        private const string EMBEDDING_MODEL = "text-embedding-004";
        /* -------------------------------------------------------------------------- */

        private readonly string _apiKey;
        private readonly HttpClient _httpClient;
        private bool _isInitialized = false;

        // 📊 [REVENUE-PROTECTION] API Usage & Rate Limit Tracking
        private int _requestCount = 0;
        private readonly int _dailyLimit = 1500;
        private DateTime _lastResetDate = DateTime.Today;

        public GeminiService(string apiKey)
        {
            _apiKey = apiKey;
            _httpClient = new HttpClient();
            _httpClient.Timeout = TimeSpan.FromSeconds(60); // PRO-LATEST models require higher headroom
        }

        public bool IsLoaded => _isInitialized && !IsLimitExceeded();

        public async Task EnsureModelExists() => await Task.CompletedTask;

        public void Initialize()
        {
            if (string.IsNullOrEmpty(_apiKey) || _apiKey == "YOUR_API_KEY_HERE")
            {
                Console.WriteLine("⚠️ [GEMINI] API Key missing. Service will be inactive.");
                _isInitialized = false;
                return;
            }
            _isInitialized = true;
            Console.WriteLine($"✨ [GEMINI-PRO-LATEST] Engine Active: {PRIMARY_MODEL}");
        }

        public bool IsLimitExceeded()
        {
            if (DateTime.Today > _lastResetDate)
            {
                _requestCount = 0;
                _lastResetDate = DateTime.Today;
                Console.WriteLine("🔄 [GEMINI] Daily quota reset.");
            }
            return _requestCount >= _dailyLimit;
        }

        /**
         * 🌌 [INFER-STREAM] Real-time AI Reasoning with Chunk Aggregation
         */
        public async IAsyncEnumerable<string> InferStreaming(string prompt)
        {
            if (!_isInitialized) { Console.WriteLine("❌ [GEMINI] Not Initialized."); yield break; }
            if (IsLimitExceeded()) { Console.WriteLine("🚨 [GEMINI] Daily Limit Reached."); yield break; }

            _requestCount++;
            Console.WriteLine($"[GEMINI-PRO] Request #{_requestCount}/{_dailyLimit} (Model: {PRIMARY_MODEL})");

            string url = $"https://generativelanguage.googleapis.com/v1beta/models/{PRIMARY_MODEL}:streamGenerateContent?key={_apiKey}";

            var requestBody = new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } },
                generationConfig = new
                {
                    maxOutputTokens = 4096,
                    temperature = 0.5,
                    topP = 0.95,
                    topK = 40,
                    stopSequences = new[] { "###" }
                },
                safetySettings = new[]
                {
                    new { category = "HARM_CATEGORY_HARASSMENT", threshold = "BLOCK_NONE" },
                    new { category = "HARM_CATEGORY_HATE_SPEECH", threshold = "BLOCK_NONE" },
                    new { category = "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold = "BLOCK_NONE" },
                    new { category = "HARM_CATEGORY_DANGEROUS_CONTENT", threshold = "BLOCK_NONE" }
                }
            };

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            HttpResponseMessage response;
            try { response = await _httpClient.PostAsync(url, content); }
            catch (Exception ex)
            {
                Console.WriteLine($"🌐 [GEMINI-NET-ERR] {ex.Message}");
                yield break;
            }

            if (!response.IsSuccessStatusCode)
            {
                string err = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"🚨 [GEMINI-API-ERR] {response.StatusCode}: {err}");
                yield break;
            }

            using var stream = await response.Content.ReadAsStreamAsync();
            using var reader = new System.IO.StreamReader(stream);

            while (!reader.EndOfStream)
            {
                string? line = await reader.ReadLineAsync();
                if (line == null) continue;

                // ⚡ [LOGIC-RECOVERY] Recovered detailed parsing logic for complex JSON structures
                string text = ExtractTextFromJson(line);
                if (!string.IsNullOrEmpty(text)) yield return text;
            }
        }

        /**
         * 📊 [KNOWLEDGE-EMBEDDING] High-Precision Vector Generation (text-embedding-004)
         */
        public async Task<float[]> GetEmbeddingAsync(string text)
        {
            if (!_isInitialized || IsLimitExceeded()) return Array.Empty<float>();

            _requestCount++;
            string url = $"https://generativelanguage.googleapis.com/v1beta/models/{EMBEDDING_MODEL}:embedContent?key={_apiKey}";

            var requestBody = new
            {
                model = $"models/{EMBEDDING_MODEL}",
                content = new { parts = new[] { new { text = text } } }
            };

            try
            {
                var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    return doc.RootElement.GetProperty("embedding").GetProperty("values")
                              .EnumerateArray().Select(v => (float)v.GetDouble()).ToArray();
                }
            }
            catch (Exception ex) { Console.WriteLine($"[EMBEDDING-ERR] {ex.Message}"); }

            return Array.Empty<float>();
        }

        /**
         * 🎨 [SKETCH-TO-DATA] Multimodal Vision Layer (v22.0)
         * Analyzes user drawings/sketches and extracts semantic location data.
         */
        public async Task<string> InferVisionAsync(byte[] imageData, string prompt, string mimeType = "image/png")
        {
            if (!_isInitialized || IsLimitExceeded()) return "AI Engine Offline or Limit Reached";

            _requestCount++;
            string base64Image = Convert.ToBase64String(imageData);
            string url = $"https://generativelanguage.googleapis.com/v1beta/models/{PRIMARY_MODEL}:generateContent?key={_apiKey}";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = prompt },
                            new { inline_data = new { mime_type = mimeType, data = base64Image } }
                        }
                    }
                },
                generationConfig = new { maxOutputTokens = 2048, temperature = 0.4 }
            };

            try
            {
                var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(url, content);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    return ExtractTextFromJson(json);
                }
                return $"Error: {response.StatusCode}";
            }
            catch (Exception ex) { return $"Vision Inference Failed: {ex.Message}"; }
        }

        /**
         * 🕵️ [JSON-EXTRACTOR] Regex-based robustness for streaming chunks (AQC v13.0)
         */
        private string ExtractTextFromJson(string json)
        {
            try
            {
                // Streaming JSON can be fragmented. Regex pulls the first valid object it sees.
                var match = System.Text.RegularExpressions.Regex.Match(json, @"\{.*\}");
                if (!match.Success) return "";

                using var doc = JsonDocument.Parse(match.Value);
                if (doc.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                {
                    var cand = candidates[0];
                    if (cand.TryGetProperty("content", out var content))
                    {
                        var parts = content.GetProperty("parts");
                        if (parts.GetArrayLength() > 0)
                        {
                            return parts[0].GetProperty("text").GetString() ?? "";
                        }
                    }
                    if (cand.TryGetProperty("finishReason", out var reason) && reason.GetString() == "SAFETY")
                    {
                        Console.WriteLine("🛡️ [GEMINI-BLOCK] Content blocked by safety filter.");
                        return "[Safety Blocked]";
                    }
                }
            }
            catch { }
            return "";
        }
    }
}
