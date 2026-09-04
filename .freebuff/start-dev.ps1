$p = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'D:\HACK-PROJECTS\TRINETRA\Frontend' -RedirectStandardOutput 'D:\HACK-PROJECTS\TRINETRA\.freebuff\preview-c675ba5b-dd5a-4a4c-a789-96948181efa5.log' -RedirectStandardError 'D:\HACK-PROJECTS\TRINETRA\.freebuff\preview-c675ba5b-dd5a-4a4c-a789-96948181efa5.log.err' -WindowStyle Hidden -PassThru
Write-Output $p.Id
