$file = "index.css"
$lines = Get-Content $file
# Keep original 864 lines, then add keyframes at end
$kept = $lines[0..862]
$kept += ""
$kept += "@keyframes shrink {"
$kept += "  from { width: 100%; }"
$kept += "  to { width: 0%; }"
$kept += "}"
$kept | Set-Content $file -Encoding UTF8
Write-Host "Done: $($kept.Count) lines"



