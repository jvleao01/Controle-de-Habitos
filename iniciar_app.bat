@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Criando o ambiente Python do projeto...
    python -m venv .venv
    if errorlevel 1 (
        echo Nao foi possivel criar o ambiente. Instale o Python e tente novamente.
        pause
        exit /b 1
    )
)

echo Conferindo e instalando dependencias...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
    echo Falha ao instalar dependencias. Verifique sua conexao e tente novamente.
    pause
    exit /b 1
)

if not exist ".env" (
    echo.
    echo Configuracao inicial do banco MySQL local deste computador:
    ".venv\Scripts\python.exe" setup_mysql.py
    if errorlevel 1 (
        pause
        exit /b 1
    )
)

set "HOST=127.0.0.1"
if not defined PORT set "PORT=5000"
set "OPEN_BROWSER=1"

echo.
echo App: http://127.0.0.1:%PORT%
echo Servidor acessivel somente neste computador.
echo.
echo Mantenha esta janela aberta enquanto usa o app. Pressione Ctrl+C para encerrar.
echo.
".venv\Scripts\python.exe" app.py
pause