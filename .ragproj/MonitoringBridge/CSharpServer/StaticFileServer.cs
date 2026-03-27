using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using MonitoringBridge.Server.Models;
using MonitoringBridge.Server.Services;

namespace MonitoringBridge.Server
{
    /**
     * 🌐 StaticFileServer
     * HTTP 정적 파일 서빙 및 Vite 환경 변수 주입 담당 인프라 레이어
     */
    public class StaticFileServer
    {
        private string? _cachedBaseDir;

        public async Task ServeAsync(HttpListenerContext context)
        {
            try
            {
                if (context.Request.Url == null) return;
                string urlPath = context.Request.Url.LocalPath;

                // 📦 [KZM-UNPACK] .kzm 패킷 언패킹 → 낱개 파일 (OS 레벨 반출)
                if (urlPath == "/api/sync/kzm-export" && context.Request.HttpMethod == "POST")
                {
                    await HandleKzmExport(context);
                    return;
                }

                if (urlPath == "/api/sync/local-export" && context.Request.HttpMethod == "POST")
                {
                    await HandleLocalExport(context);
                    return;
                }

                // 📡 [EXTENSION-API]
                if (urlPath == "/api/sync/status" && context.Request.HttpMethod == "GET")
                {
                    await HandleSyncStatus(context);
                    return;
                }

                if (urlPath == "/" || string.IsNullOrEmpty(urlPath)) urlPath = "/index.html";
                if (_cachedBaseDir == null) _cachedBaseDir = FindFrontendDir();
                if (_cachedBaseDir == null) { context.Response.StatusCode = 500; context.Response.Close(); return; }

                string filePath = Path.GetFullPath(Path.Combine(_cachedBaseDir, urlPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar)));
                
                if (File.Exists(filePath))
                {
                    byte[] content = await File.ReadAllBytesAsync(filePath);
                    string extension = Path.GetExtension(filePath).ToLower();
                    context.Response.ContentType = MimeTypeHelper.GetMimeType(extension);

                    if (extension == ".js" || extension == ".html") content = TransformContent(content);

                    context.Response.ContentLength64 = content.Length;
                    await context.Response.OutputStream.WriteAsync(content, 0, content.Length);
                }
                else { context.Response.StatusCode = 404; }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SERVE ERROR] {ex.Message}");
                context.Response.StatusCode = 500;
            }
            finally { context.Response.Close(); }
        }

        private async Task HandleKzmExport(HttpListenerContext context)
        {
            using (var reader = new StreamReader(context.Request.InputStream))
            {
                string body = await reader.ReadToEndAsync();
                var req = JsonNode.Parse(body);
                string exportDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "Kuzmo_Exports");
                if (!Directory.Exists(exportDir)) Directory.CreateDirectory(exportDir);

                var filePaths = new List<string>();
                var packets = req?["packets"]?.AsArray() ?? new JsonArray();
                foreach (var packet in packets)
                {
                    var manifest = packet?["manifest"];
                    var files = packet?["files"];
                    if (manifest == null || files == null) continue;

                    string rawTitle = (string?)manifest["title"] ?? "Untitled";
                    string cleanTitle = string.Join("_", rawTitle.Split(Path.GetInvalidFileNameChars())).Trim();
                    string itemDir = Path.Combine(exportDir, cleanTitle);
                    if (!Directory.Exists(itemDir)) Directory.CreateDirectory(itemDir);

                    foreach (var file in files.AsObject())
                    {
                        string fileName = file.Key;
                        string b64 = file.Value?.ToString() ?? "";
                        if (string.IsNullOrEmpty(b64)) continue;
                        byte[] bytes = Convert.FromBase64String(b64);
                        string outPath = Path.Combine(itemDir, fileName);
                        await File.WriteAllBytesAsync(outPath, bytes);
                        filePaths.Add(outPath);
                    }
                }

                NativeClipboard.SetFileDropList(filePaths);
                context.Response.ContentType = "application/json";
                byte[] res = Encoding.UTF8.GetBytes($"{{\"status\":\"ok\",\"count\":{filePaths.Count},\"path\":\"{exportDir.Replace("\\", "\\\\")}\"}}");
                await context.Response.OutputStream.WriteAsync(res, 0, res.Length);
                context.Response.Close();
            }
        }

        private async Task HandleLocalExport(HttpListenerContext context)
        {
            using (var reader = new StreamReader(context.Request.InputStream))
            {
                string json = await reader.ReadToEndAsync();
                var items = JsonNode.Parse(json).AsArray();
                string exportDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "Kuzmo_Exports");
                if (!Directory.Exists(exportDir)) Directory.CreateDirectory(exportDir);
                
                var filePaths = new List<string>();
                using var httpClient = new HttpClient();
                foreach (var item in items)
                {
                    string rawTitle = (string)item["title"] ?? "Untitled";
                    string cleanTitle = string.Join("_", rawTitle.Split(Path.GetInvalidFileNameChars())).Trim();
                    string mdPath = Path.Combine(exportDir, $"{cleanTitle}.md");
                    File.WriteAllText(mdPath, (string)item["content"], Encoding.UTF8);
                    filePaths.Add(mdPath);

                    if (item["audioUrl"] != null)
                    {
                        string audioUrl = (string)item["audioUrl"];
                        string audioPath = Path.Combine(exportDir, $"{cleanTitle}_audio.mp3");
                        if (await DownloadFileAsync(httpClient, audioUrl, audioPath)) filePaths.Add(audioPath);
                    }
                }

                NativeClipboard.SetFileDropList(filePaths);
                Program.LastSelectionJson = "{\"status\":\"ok\", \"items\": " + json + "}";
                context.Response.ContentType = "application/json";
                byte[] res = Encoding.UTF8.GetBytes("{\"status\":\"ok\", \"path\": \"" + exportDir.Replace("\\", "\\\\") + "\"}");
                await context.Response.OutputStream.WriteAsync(res, 0, res.Length);
                context.Response.Close();
            }
        }

        private async Task HandleSyncStatus(HttpListenerContext context)
        {
            context.Response.Headers.Add("Access-Control-Allow-Origin", "*");
            context.Response.ContentType = "application/json";
            byte[] res = Encoding.UTF8.GetBytes(Program.LastSelectionJson);
            await context.Response.OutputStream.WriteAsync(res, 0, res.Length);
            context.Response.Close();
        }

        private static byte[] TransformContent(byte[] content)
        {
            string text = Encoding.UTF8.GetString(content);
            text = text.Replace("import.meta.env.VITE_GOOGLE_API_KEY", $"\"{AppConfig.GoogleApiKey}\"");
            text = text.Replace("import.meta.env.VITE_GOOGLE_CLIENT_ID", $"\"{AppConfig.GoogleClientId}\"");
            text = text.Replace("import.meta.env.VITE_GOOGLE_APP_ID", $"\"{AppConfig.GoogleAppId}\"");
            return Encoding.UTF8.GetBytes(text);
        }

        private string? FindFrontendDir()
        {
            string current = AppContext.BaseDirectory;
            while (current != null)
            {
                string candidate = Path.Combine(current, "eventmap-platform", "frontend-web", "dist");
                if (Directory.Exists(candidate)) return candidate;
                candidate = Path.Combine(current, "eventmap-platform", "frontend-web");
                if (Directory.Exists(Path.Combine(candidate, "public"))) return candidate;
                current = Path.GetDirectoryName(current)!;
            }
            return null;
        }

        private static async Task<bool> DownloadFileAsync(HttpClient client, string url, string path)
        {
            try { byte[] bytes = await client.GetByteArrayAsync(url); await File.WriteAllBytesAsync(path, bytes); return true; }
            catch { return false; }
        }
    }
}
