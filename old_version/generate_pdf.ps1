$htmlPath = Join-Path $PSScriptRoot "dossier_apa.html"
$pdfPath = Join-Path $PSScriptRoot "dossier_apa.pdf"

$edgePaths = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "msedge"
)

$edgePath = $null
foreach ($path in $edgePaths) {
    if (Get-Command $path -ErrorAction SilentlyContinue) {
        $edgePath = $path
        break
    }
    if (Test-Path $path) {
        $edgePath = $path
        break
    }
}

if ($null -eq $edgePath) {
    Write-Error "Microsoft Edge est introuvable sur le système. Impossible de générer le PDF de manière automatisée."
    exit 1
}

Write-Host "Edge trouvé à l'emplacement : $edgePath"
Write-Host "Conversion de $htmlPath vers $pdfPath..."

# Exécution de msedge en mode headless pour imprimer en PDF
$process = Start-Process -FilePath $edgePath -ArgumentList "--headless", "--disable-gpu", "--print-to-pdf=`"$pdfPath`"", "`"$htmlPath`"" -PassThru -Wait -NoNewWindow

if (Test-Path $pdfPath) {
    Write-Host "Succès : Fichier PDF généré avec succès à l'adresse $pdfPath"
} else {
    Write-Error "Erreur : Le fichier PDF n'a pas pu être généré."
    exit 1
}
