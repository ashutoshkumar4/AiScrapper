$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Start-Process powershell.exe -ArgumentList '-ExecutionPolicy','Bypass','-File',(Join-Path $root 'start-backend.ps1') -WindowStyle Normal
Start-Sleep -Seconds 3
Start-Process powershell.exe -ArgumentList '-ExecutionPolicy','Bypass','-File',(Join-Path $root 'start-frontend.ps1') -WindowStyle Normal
Start-Sleep -Seconds 5
Start-Process 'http://localhost:4200'
