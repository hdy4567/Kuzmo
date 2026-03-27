using System.Collections.Generic;
using System.Threading.Tasks;

namespace MonitoringBridge.Server.Services
{
    /**
     * 🧩 IAiService Interface (v22.42)
     * Pure Interface for Cloud AI Engines (Gemini).
     */
    public interface IAiService
    {
        bool IsLoaded { get; }
        Task EnsureModelExists();
        void Initialize();
        IAsyncEnumerable<string> InferStreaming(string prompt);
        Task<float[]> GetEmbeddingAsync(string text);
        Task<string> InferVisionAsync(byte[] imageData, string prompt, string mimeType = "image/png");
    }
}
