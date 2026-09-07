$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$backend=Join-Path $root 'backend'
$scraper='C:\Users\ashut\Documents\GitHub\scraper'
$docker='C:\Users\ashut\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe'
$dockerDesktop='C:\Users\ashut\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe'
$ready=$false
try{Invoke-WebRequest -Uri 'http://localhost:8001/docs' -UseBasicParsing -TimeoutSec 2|Out-Null;$ready=$true}catch{}
if(-not $ready){
  if(-not(Test-Path -LiteralPath $docker)){throw 'Docker CLI was not found.'}
  & $docker info *> $null
  if($LASTEXITCODE -ne 0){Start-Process -FilePath $dockerDesktop -WindowStyle Hidden;for($i=0;$i -lt 45;$i++){Start-Sleep -Seconds 2;& $docker info *> $null;if($LASTEXITCODE -eq 0){break}}}
  & $docker image inspect scraper-scraper:latest *> $null
  if($LASTEXITCODE -ne 0){& $docker build -t scraper-scraper:latest $scraper;if($LASTEXITCODE -ne 0){throw 'Scraper image failed to build.'}}
  $container=& $docker ps -a --filter 'name=^/poe_scraper_api$' --format '{{.Names}}'
  if($container){& $docker start poe_scraper_api|Out-Null}else{& $docker run -d --name poe_scraper_api --env-file (Join-Path $scraper '.env') -e DATABASE_URL=sqlite:////data/tasks.db -p 8001:8000 -v poe-scraper-db:/data -v poe-scraper-logs:/app/scraper_logs scraper-scraper:latest|Out-Null}
}
Set-Location $backend
if(-not(Test-Path -LiteralPath (Join-Path $backend 'node_modules'))){npm install;if($LASTEXITCODE -ne 0){throw 'Backend dependency installation failed.'}}
npm start
