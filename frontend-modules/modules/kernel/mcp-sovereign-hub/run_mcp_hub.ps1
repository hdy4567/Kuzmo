Write-Host "🛰️ [MCP-HUB] Activating Sovereign Bridge..." -ForegroundColor Cyan
Write-Host "📦 [SQLITE] Mapping to persistence/kzm_local.db"
Write-Host "🌐 [FETCH] Ready for markdown conversion"
Write-Host "🔍 [EVERYTHING] Indexing project root..."
npx -y @modelcontextprotocol/server-sqlite --db ../../persistence/kzm_local.db
