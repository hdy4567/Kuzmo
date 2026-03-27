using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.IO;
using System.Runtime.InteropServices;
using MonitoringBridge.Server.Models;
using MonitoringBridge.Server.Services;
using MonitoringBridge.Server.Services.Map;

namespace MonitoringBridge.Server
{
    /**
     * 🚀 ServiceContainer
     * Dependency Injection 및 서비스 생명 관리를 담당하는 클린 아키텍처 부트스트래퍼
     */
    public class ServiceContainer
    {
        public KnowledgeEngine Knowledge { get; private set; }
        public GeminiService Gemini { get; private set; }
        public CommunicationService CommService { get; private set; }
        public ExternalKnowledgeFetcher External { get; private set; }
        public PersonalMemoryManager Memory { get; private set; }
        public MoERouter Router { get; private set; }
        public AIIntelligenceSentinel Sentinel { get; private set; }

        public ServiceContainer()
        {
            Knowledge = new KnowledgeEngine();
            External = new ExternalKnowledgeFetcher(new HttpClient());
            Gemini = new GeminiService(AppConfig.GoogleApiKey);
            Memory = new PersonalMemoryManager();
            Router = new MoERouter();
            Sentinel = new AIIntelligenceSentinel();

            CommService = new CommunicationService(Knowledge, Memory, Router, Sentinel, (IAiService)Gemini);
        }

        public async Task InitializeAsync()
        {
            Gemini?.Initialize();
            await Task.CompletedTask;

            // Background Seed
            _ = System.Threading.Tasks.Task.Run(async () => {
                try { await Knowledge.SeedKnowledge(); }
                catch (Exception ex) { Console.WriteLine($"[SEED ERROR] {ex.Message}"); }
            });
        }
    }

    /**
     * 🛡️ [NATIVE-CLIPBOARD-ENGINE]
     * Direct Win32 API implementation for True File Copy (CF_HDROP).
     */
    public static class NativeClipboard
    {
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool OpenClipboard(IntPtr hWndNewOwner);
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool EmptyClipboard();
        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SetClipboardData(uint uFormat, IntPtr hMem);
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool CloseClipboard();
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GlobalAlloc(uint uFlags, UIntPtr dwBytes);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GlobalLock(IntPtr hMem);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool GlobalUnlock(IntPtr hMem);
        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        private const uint CF_HDROP = 15;
        private const uint GMEM_MOVEABLE = 0x0002;
        private const uint GMEM_ZEROINIT = 0x0040;

        [StructLayout(LayoutKind.Sequential)]
        struct DROPFILES
        {
            public int pFiles;
            public int x;
            public int y;
            public int fNC;
            public int fWide;
        }

        public static void SetFileDropList(IEnumerable<string> filePaths)
        {
            var thread = new Thread(() =>
            {
                string logFile = @"c:\YOON\CSrepos\NewEventMap\MonitoringBridge\CSharpServer\server_debug.log";
                try
                {
                    IntPtr hWnd = GetForegroundWindow();
                    if (!OpenClipboard(hWnd)) hWnd = IntPtr.Zero;
                    if (!OpenClipboard(hWnd)) return;

                    EmptyClipboard();

                    string files = string.Join("\0", filePaths) + "\0\0";
                    byte[] fileBytes = Encoding.Unicode.GetBytes(files);

                    int structSize = Marshal.SizeOf<DROPFILES>();
                    uint totalSize = (uint)(structSize + fileBytes.Length);

                    IntPtr hGlobal = GlobalAlloc(GMEM_MOVEABLE | GMEM_ZEROINIT, (UIntPtr)totalSize);
                    IntPtr pGlobal = GlobalLock(hGlobal);

                    DROPFILES df = new DROPFILES { pFiles = structSize, fWide = 1 };
                    Marshal.StructureToPtr(df, pGlobal, false);
                    Marshal.Copy(fileBytes, 0, (IntPtr)((long)pGlobal + structSize), fileBytes.Length);

                    GlobalUnlock(hGlobal);
                    SetClipboardData(CF_HDROP, hGlobal);
                    CloseClipboard();

                    File.AppendAllText(logFile, $"[{DateTime.Now}] [SUCCESS] Injected {filePaths.Count()} files.\n");
                    Console.WriteLine($"🚀 [WIN32_SYNC] {filePaths.Count()} files injected.");
                }
                catch (Exception ex) 
                { 
                    File.AppendAllText(logFile, $"[{DateTime.Now}] [ERROR] {ex.Message}\n");
                    Console.WriteLine($"[NATIVE_CLIP_ERR] {ex.Message}");
                }
            });

            thread.SetApartmentState(ApartmentState.STA);
            thread.Start();
            thread.Join();
        }
    }
}
