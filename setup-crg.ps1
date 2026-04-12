# ─────────────────────────────────────────────────────────────
# code-review-graph — Automated Setup Script (Windows)
# Works on: Windows 10/11, PowerShell 5.1+
# Usage: .\setup-crg.ps1 [-WithCommunities] [-WithEmbeddings] [-WithAll]
# ─────────────────────────────────────────────────────────────
param(
    [switch]$WithCommunities,
    [switch]$WithEmbeddings,
    [switch]$WithAll
)

$ErrorActionPreference = "Stop"

if ($WithAll) { $WithCommunities = $true; $WithEmbeddings = $true }

function Info($msg)  { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Ok($msg)    { Write-Host "[OK] $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Fail($msg)  { Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }

# ── Step 1: Check Python ──
Info "Checking Python..."
$python = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $ver = & $cmd -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
        $major = & $cmd -c "import sys; print(sys.version_info.major)" 2>$null
        $minor = & $cmd -c "import sys; print(sys.version_info.minor)" 2>$null
        if ([int]$major -ge 3 -and [int]$minor -ge 10) {
            $python = $cmd
            Ok "Python $ver found ($cmd)"
            break
        }
    } catch {}
}
if (-not $python) { Fail "Python 3.10+ required. Install from https://python.org" }

# ── Step 2: Install ──
$installed = $false
try { $null = & code-review-graph --version 2>$null; $installed = $true } catch {}

if ($installed) {
    $v = & code-review-graph --version 2>$null
    Ok "code-review-graph already installed ($v)"
} else {
    Info "Installing code-review-graph..."
    & $python -m pip install code-review-graph
    if ($LASTEXITCODE -ne 0) { Fail "pip install failed. Try: $python -m pip install --user code-review-graph" }
    Ok "Installed via pip"

    # Verify on PATH
    try { $null = & code-review-graph --version 2>$null }
    catch {
        Warn "code-review-graph not on PATH. Adding Python Scripts to PATH..."
        $scriptsDir = & $python -c "import sysconfig; print(sysconfig.get_path('scripts'))" 2>$null
        if ($scriptsDir) {
            $env:PATH = "$scriptsDir;$env:PATH"
            Warn "Added $scriptsDir to PATH for this session. Add permanently via System Settings."
        }
    }
}

# ── Step 3: Configure MCP ──
Info "Configuring MCP server..."
try {
    & code-review-graph install --platform claude-code 2>$null
    Ok "MCP server configured"
} catch {
    Warn "Auto-configure failed. Run manually: code-review-graph install"
}

# ── Step 4: Build graph ──
if (-not (Test-Path ".code-review-graph/graph.db")) {
    Info "Building knowledge graph (first build)..."
    & code-review-graph build
} else {
    Info "Graph exists. Incremental update..."
    try { & code-review-graph update --base HEAD~5 2>$null }
    catch { & code-review-graph build }
}

Write-Host ""
& code-review-graph status
Write-Host ""

# ── Step 5: Extras ──
if ($WithCommunities) {
    Info "Installing communities extra..."
    & $python -m pip install "code-review-graph[communities]"
    Ok "Communities deps installed"

    Info "Rebuilding graph..."
    & code-review-graph build

    Info "Running community detection (v2.1.0 workaround)..."
    & $python -c @"
import sys, glob
try:
    from code_review_graph.graph import GraphStore
    from code_review_graph.communities import detect_communities, store_communities
    dbs = glob.glob('.code-review-graph/graph.db')
    if not dbs:
        print('No graph DB found')
        sys.exit(0)
    gs = GraphStore(dbs[0])
    comms = detect_communities(gs)
    store_communities(gs, comms)
    print(f'Communities detected: {len(comms)}')
except ImportError:
    print('igraph/leidenalg not importable')
except Exception as e:
    print(f'Community detection failed: {e}')
"@
}

if ($WithEmbeddings) {
    Warn "Embeddings require PyTorch (~2GB download). Takes 5-10 minutes."
    $reply = Read-Host "Continue? [y/N]"
    if ($reply -eq 'y' -or $reply -eq 'Y') {
        Info "Installing embeddings..."
        & $python -m pip install "code-review-graph[embeddings]"
        Ok "Embeddings installed. Use embed_graph MCP tool to compute vectors."
    } else {
        Info "Skipped embeddings."
    }
}

# ── Step 6: .gitignore ──
if (Test-Path ".gitignore") {
    $content = Get-Content ".gitignore" -Raw -ErrorAction SilentlyContinue
    if ($content -notmatch "code-review-graph") {
        Add-Content ".gitignore" "`n# code-review-graph`n.code-review-graph/"
        Ok "Added .code-review-graph/ to .gitignore"
    }
}

# ── Step 7: Health check ──
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Health Check" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan

$pass = 0; $total = 0

function Check($name, $test) {
    $script:total++
    try {
        $result = & $python -c $test 2>$null
        if ($LASTEXITCODE -eq 0) { Ok $name; $script:pass++ }
        else { Warn "$name - FAILED" }
    } catch { Warn "$name - FAILED" }
}

$total++
try { $null = & code-review-graph --version 2>$null; Ok "code-review-graph on PATH"; $pass++ }
catch { Warn "code-review-graph on PATH - FAILED" }

$total++
if (Test-Path ".code-review-graph/graph.db") { Ok "Graph DB exists"; $pass++ }
else { Warn "Graph DB exists - FAILED" }

Check "Nodes > 0" "import sqlite3; db=sqlite3.connect('.code-review-graph/graph.db'); n=db.execute('SELECT COUNT(*) FROM nodes').fetchone()[0]; assert n > 0"
Check "Edges > 0" "import sqlite3; db=sqlite3.connect('.code-review-graph/graph.db'); n=db.execute('SELECT COUNT(*) FROM edges').fetchone()[0]; assert n > 0"

if ($WithCommunities) {
    Check "Communities > 0" "import sqlite3; db=sqlite3.connect('.code-review-graph/graph.db'); n=db.execute('SELECT COUNT(*) FROM communities').fetchone()[0]; assert n > 0"
}

Write-Host ""
Write-Host "Passed: $pass/$total" -ForegroundColor Green

if ($pass -eq $total) {
    Write-Host ""
    Write-Host "Setup complete. Your AI assistant can now use the knowledge graph." -ForegroundColor Green
    Write-Host ""
    Write-Host 'Quick test - ask your AI:'
    Write-Host '  "Use detect_changes to review my recent changes"'
    Write-Host '  "Use query_graph to find callers of <function_name>"'
} else {
    Write-Host ""
    Warn "Some checks failed. See warnings above."
}
