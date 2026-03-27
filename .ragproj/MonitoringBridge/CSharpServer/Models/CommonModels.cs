using System;
using System.Collections.Generic;

namespace MonitoringBridge.Server.Models
{
    public class MemoryFragment
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new List<string>();
        public DateTime Timestamp { get; set; } = DateTime.Now;
    }

    public class TourismInfo
    {
        public string Id { get; set; } = Guid.NewGuid().ToString(); 
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }
        public List<string> Tags { get; set; } = new List<string>();
        public string Category { get; set; } = "poi"; 
        public Dictionary<string, double> Neighbors { get; set; } = new Dictionary<string, double>();
        public DateTime Timestamp { get; set; } = DateTime.Now;
        public float[]? Vector { get; set; }
    }

    public class KnowledgeSearchResult 
    {
        public string Context { get; set; } = string.Empty;
        public List<string> SourceIds { get; set; } = new List<string>();
    }

    public class Trajectory
    {
        public string Region { get; set; } = string.Empty;
        public List<TourismInfo> Points { get; set; } = new List<TourismInfo>();
        public double EfficiencyScore { get; set; }
        public double DiversityScore { get; set; }
        public double RelevanceScore { get; set; }
        public string Reasoning { get; set; } = string.Empty;
    }
}
