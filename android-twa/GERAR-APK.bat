@echo off
echo.
echo ============================================
echo   FibroVida — Gerador de APK para Play Store
echo ============================================
echo.

REM 1. Gera o keystore (assinatura do app) — só na primeira vez
IF NOT EXIST fibrovida-release.keystore (
    echo [1/4] Gerando keystore de assinatura...
    keytool -genkey -v -keystore fibrovida-release.keystore ^
        -alias fibrovida ^
        -keyalg RSA -keysize 2048 -validity 10000 ^
        -dname "CN=FibroVida, OU=App, O=FibroVida, L=Brasil, ST=SP, C=BR"
    echo.
    echo [IMPORTANTE] Guarde a senha do keystore em local seguro!
    echo.
) ELSE (
    echo [1/4] Keystore ja existe. Pulando...
)

REM 2. Mostra o SHA-256 para copiar no assetlinks.json
echo [2/4] SHA-256 do keystore (copie para .well-known/assetlinks.json):
keytool -list -v -keystore fibrovida-release.keystore -alias fibrovida | findstr "SHA256"
echo.

REM 3. Gera o projeto Android
echo [3/4] Gerando projeto Android com Bubblewrap...
cd ..
bubblewrap build --skipPwaValidation
echo.

REM 4. APK gerado
echo [4/4] APK gerado em: app-release-signed.apk
echo.
echo Proximos passos:
echo  1. Cole o SHA-256 acima no arquivo .well-known/assetlinks.json
echo  2. Faca commit e push do .well-known/assetlinks.json para o GitHub
echo  3. Acesse play.google.com/console para criar o app e fazer upload do APK
echo.
pause
