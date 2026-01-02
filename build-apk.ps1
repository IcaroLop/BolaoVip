# Script para build completo do APK - BolaoVip
# Execute: .\build-apk.ps1

$frontendPath = "C:\BolaoVIP\frontend\bolao-vip"
$androidPath  = "$frontendPath\android"

Write-Host "🚀 Iniciando build do BolaoVip APK..." -ForegroundColor Green
Write-Host ""

# 1. Build do React
Write-Host "📦 Passo 1/3: Build do React..." -ForegroundColor Yellow
Push-Location $frontendPath
npm run build
$buildExit = $LASTEXITCODE
Pop-Location

if ($buildExit -ne 0) {
    Write-Host "❌ Erro no build do React!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build do React concluído!" -ForegroundColor Green
Write-Host ""

# 2. Sincronizar com Android
Write-Host "🔄 Passo 2/3: Sincronizando com Android..." -ForegroundColor Yellow
Push-Location $frontendPath
npx cap sync android
$syncExit = $LASTEXITCODE
Pop-Location

if ($syncExit -ne 0) {
    Write-Host "❌ Erro ao sincronizar!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Sincronização concluída!" -ForegroundColor Green
Write-Host ""

# 3. Gerar APK (Release)
Write-Host "🔨 Passo 3/3: Gerando APK Release (clean) ..." -ForegroundColor Yellow
Push-Location $androidPath
./gradlew.bat clean assembleRelease
$apkExit = $LASTEXITCODE
Pop-Location

if ($apkExit -ne 0) {
    Write-Host "❌ Erro ao gerar APK Release!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅✅✅ APK Release gerado com sucesso! ✅✅✅" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Localização do APK (release):" -ForegroundColor Cyan
Write-Host "   $androidPath\app\build\outputs\apk\release\app-release.apk"
Write-Host ""
Write-Host "📂 Abrindo pasta do APK Release..." -ForegroundColor Yellow
Write-Host "⚠️ Atenção: o APK release pode estar unsigned. Assine-o antes de distribuir." -ForegroundColor Yellow

# Abrir pasta do APK (release)
explorer "$androidPath\app\build\outputs\apk\release"

Write-Host ""
Write-Host "🎉 Processo concluído!" -ForegroundColor Green
Write-Host "   Transfira o app-debug.apk para seu celular e instale."
Write-Host ""
Write-Host "⚠️  Lembre-se:" -ForegroundColor Yellow
Write-Host "   - Backend deve estar rodando em http://192.168.56.127:3001"
Write-Host "   - PC e celular devem estar na mesma WiFi"
Write-Host ""
