using System;
using System.IO;

namespace MonitoringBridge.Server.Models
{
    public static class AppConfig
    {
        // 🔐 [SECURITY-LOADER] Environment variables mapped from .env
        static AppConfig()
        {
            try
            {
                // Root .env file loader
                string root = FindRoot();
                string envPath = Path.Combine(root, ".env");
                if (File.Exists(envPath))
                {
                    DotNetEnv.Env.Load(envPath);
                    Console.WriteLine($"✅ Environment loaded from: {envPath}");
                }
                else
                {
                    // Fallback to frontend-web .env
                    string feEnv = Path.Combine(root, "eventmap-platform", "frontend-web", ".env");
                    if (File.Exists(feEnv))
                    {
                        DotNetEnv.Env.Load(feEnv);
                        Console.WriteLine($"✅ Environment loaded from FE: {feEnv}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ [ENV LOAD ERROR] {ex.Message}");
            }
        }

        public static string GoogleApiKey => GetEnv("VITE_GOOGLE_API_KEY", "YOUR_API_KEY_HERE");
        public static string GoogleClientId => GetEnv("VITE_GOOGLE_CLIENT_ID", "YOUR_CLIENT_ID_HERE");
        public static string GoogleAppId => GetEnv("VITE_GOOGLE_APP_ID", "YOUR_APP_ID_HERE");

        public static readonly int Port = 9091;

        private static string GetEnv(string key, string fallback)
        {
            string? val = Environment.GetEnvironmentVariable(key);
            return string.IsNullOrEmpty(val) ? fallback : val;
        }

        private static string FindRoot()
        {
            string current = AppContext.BaseDirectory;
            while (current != null)
            {
                if (File.Exists(Path.Combine(current, ".gitignore"))) return current;
                current = Path.GetDirectoryName(current)!;
            }
            return AppContext.BaseDirectory;
        }
    }
}
