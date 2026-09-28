$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$agentPath = Join-Path $projectRoot 'browser-agent'
Copy-Item -LiteralPath (Join-Path $projectRoot 'src/services/supplierCartModel.js') -Destination (Join-Path $agentPath 'model.js') -Force
Compress-Archive -Path (Join-Path $agentPath '*') -DestinationPath (Join-Path $projectRoot 'public/profo-winkelwagenagent.zip') -Force
Write-Output 'Browseragent verpakt zonder omgevingsbestanden of accounts.'
