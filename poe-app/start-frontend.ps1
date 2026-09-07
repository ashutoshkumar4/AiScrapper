$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $root 'frontend')
if(-not(Test-Path -LiteralPath '.\node_modules')){npm install;if($LASTEXITCODE -ne 0){throw 'Frontend dependency installation failed.'}}
npm start
