# Ritmo | Controle de hábitos

Ritmo é uma aplicação web pessoal para registrar hábitos e acompanhar gastos. O painel reúne atividade física, leitura, estudos, sono, alimentação e finanças, com metas, histórico e gráficos semanais e mensais.

O app pode ser usado sem banco de dados: nesse modo, os registros ficam no `localStorage` do navegador. Se um MySQL local estiver configurado, os registros passam a ser gravados no banco e ficam associados a essa instalação do servidor. Não há conta de usuário, sincronização entre computadores ou sincronização com celulares.

## Funcionalidades

- Registrar atividade física em minutos, leitura em páginas, estudos em minutos, sono em horas e alimentação em porções.
- Acompanhar o progresso diário e semanal em relação às metas definidas na interface.
- Registrar despesas por valor, data, descrição e categoria: necessidade, desejo ou investimento.
- Consultar gráficos de hábitos e gastos, além dos 12 registros mais recentes de cada seção.
- Excluir lançamentos pelo histórico.
- Usar armazenamento local no navegador quando o MySQL não estiver disponível.
- Importar para o MySQL os registros locais reais quando o app inicia com o banco disponível. Registros de demonstração não são importados.

## Tecnologias

- Python e Flask para servir a aplicação e fornecer a API HTTP.
- MySQL opcional para persistência no servidor; `mysql-connector-python` faz a conexão.
- HTML, CSS e JavaScript sem framework no navegador.
- Chart.js para gráficos e Lucide para ícones. Essas duas bibliotecas e as fontes Montserrat e Inter são carregadas por CDN e precisam de internet para aparecer corretamente.

## Arquivos e pastas

```text
.
├── .env.example          # Exemplo de configuração do MySQL e da porta local
├── .gitignore            # Impede que arquivos locais e credenciais entrem no Git
├── .vscode/
│   └── tasks.json        # Tarefa do VS Code para iniciar o app ao abrir a pasta
├── app.py                # Aplicação Flask, conexão MySQL e rotas da API
├── iniciar_app.bat       # Prepara o ambiente e inicia o app no Windows
├── README.md             # Documentação do projeto
├── requirements.txt      # Dependências Python necessárias
├── schema.sql            # Criação do banco e das tabelas MySQL
├── setup_mysql.py        # Configuração inicial automática do MySQL local
├── static/
│   ├── app.js            # Interface, formulários, gráficos e armazenamento local
│   └── styles.css        # Aparência e comportamento responsivo
├── templates/
│   └── index.html        # Estrutura HTML principal carregada pelo Flask
└── tests/
    └── test_app.py       # Testes da API Flask e das operações de banco
```

Arquivos gerados durante a execução:

- `.env`: credenciais e configurações locais. Não deve ser enviado ao Git.
- `.venv/`: ambiente virtual Python do projeto.
- `__pycache__/`: arquivos compilados gerados pelo Python.

Esses itens locais são ignorados pelo `.gitignore` (exceto `.env.example`, que é seguro para compartilhar porque contém valores ilustrativos).

## Requisitos

- Windows, para usar o inicializador `iniciar_app.bat`; em outros sistemas, é possível instalar as dependências e iniciar `app.py` manualmente com Python.
- Python 3.10 ou mais recente recomendado.
- MySQL local apenas para persistir os dados no servidor. Sem MySQL, o app continua utilizável no navegador.
- Acesso à internet para instalar as dependências e carregar Chart.js, Lucide e as fontes externas.

## Instalação e execução no Windows

Abra o PowerShell na pasta do projeto. Crie o ambiente virtual e instale as dependências:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Início automático com MySQL

Instale e inicie o MySQL local. Em seguida, execute:

```powershell
.\iniciar_app.bat
```

Na primeira execução, o inicializador cria o ambiente virtual se necessário, instala as dependências e chama `setup_mysql.py`. O assistente solicita a senha administrativa do MySQL com entrada oculta, cria o banco e as tabelas, gera uma senha aleatória para o usuário `habitflow_app` e grava as configurações em `.env`. O servidor abre em `http://127.0.0.1:5000` e a janela do terminal deve permanecer aberta enquanto o app estiver em uso. Pressione `Ctrl+C` para encerrá-lo.

O inicializador automático configura o MySQL antes de iniciar o app. Portanto, para usar sem MySQL, siga a opção de início manual abaixo.

### Início manual, com ou sem MySQL

Depois de instalar as dependências, inicie o Flask:

```powershell
.\.venv\Scripts\python.exe app.py
```

Acesse `http://127.0.0.1:5000`. Sem arquivo `.env`, o app tenta as configurações padrão (MySQL em `127.0.0.1:3306`, usuário `root`, senha vazia e banco `habitflow`). Se a conexão falhar, a interface continua usando o armazenamento local do navegador.

### Início pelo VS Code

O arquivo `.vscode/tasks.json` define a tarefa **Ritmo: iniciar app no computador**, executada ao abrir a pasta no VS Code. Autorize a tarefa quando o editor solicitar. Ela chama `iniciar_app.bat`; por isso, depende do MySQL para a configuração inicial quando `.env` ainda não existe. Também é possível selecioná-la em **Terminal > Run Task**.

## Configurar o MySQL manualmente

1. Execute `schema.sql` usando uma conta administrativa do MySQL. O script cria o banco `habitflow` e as tabelas `habit_entries` e `expenses`.
2. Crie um usuário de aplicação com permissões limitadas. Use a mesma senha que será informada em `.env`:

```sql
CREATE USER 'habitflow_app'@'127.0.0.1' IDENTIFIED BY 'escolha-uma-senha-forte';
GRANT SELECT, INSERT, DELETE ON habitflow.* TO 'habitflow_app'@'127.0.0.1';
```

3. Copie `.env.example` para `.env` e substitua `DB_PASSWORD` pela senha definida acima. Ajuste host, porta ou usuário se sua instalação do MySQL for diferente.
4. Inicie o app com `.\.venv\Scripts\python.exe app.py`.

O usuário da aplicação precisa ler, inserir e excluir registros. A configuração automática cria esse usuário e aplica essas permissões. Não reutilize a senha administrativa do MySQL para a aplicação.

### Variáveis de ambiente

| Variável | Finalidade | Padrão |
| --- | --- | --- |
| `DB_HOST` | Endereço do servidor MySQL | `127.0.0.1` |
| `DB_PORT` | Porta do MySQL | `3306` |
| `DB_USER` | Usuário de conexão | `root` |
| `DB_PASSWORD` | Senha do usuário de conexão | vazia |
| `DB_NAME` | Banco utilizado | `habitflow` |
| `DB_CONNECT_TIMEOUT` | Tempo limite da conexão, em segundos | `5` |
| `HOST` | Interface de rede em que o Flask escuta | `127.0.0.1` |
| `PORT` | Porta HTTP da aplicação | `5000` |
| `OPEN_BROWSER` | Abre o navegador automaticamente se definido como `1` | não definido |
| `FLASK_DEBUG` | Ativa o modo de depuração se definido como `1` | `0` |

Para manter o app acessível somente no computador local, conserve `HOST=127.0.0.1`. Não ative o modo de depuração em uma instalação exposta a outras pessoas.

## Como os dados são armazenados

- No primeiro acesso em um navegador sem dados anteriores, a interface cria registros de demonstração para preencher os gráficos. Eles são identificados como demonstração e não são enviados ao MySQL.
- Sem conexão com o MySQL, novos registros ficam no `localStorage` daquele navegador e perfil. Limpar os dados do site ou trocar de navegador pode apagá-los; eles não são compartilhados entre dispositivos.
- Com MySQL disponível ao carregar a aplicação, registros locais reais pendentes são enviados ao servidor. Em seguida, a interface carrega os registros do banco. Registros de demonstração não são importados.
- Com o MySQL conectado, novos registros são gravados no banco. O status na interface indica se os dados estão sincronizados ou salvos localmente.
- As tabelas do MySQL contêm `habit_entries` para hábitos e `expenses` para despesas. Valores são armazenados como números decimais; datas são armazenadas como datas SQL.

## API HTTP

A API é servida pelo mesmo processo Flask que entrega a interface:

| Método e rota | Descrição |
| --- | --- |
| `GET /` | Entrega a página principal. |
| `GET /api/health` | Verifica a conexão e as tabelas do MySQL; responde com `{"database":"connected"}` ou status `503` quando indisponível. |
| `GET /api/entries?start=AAAA-MM-DD&end=AAAA-MM-DD` | Lista hábitos e despesas no intervalo informado. |
| `POST /api/entries` | Cria um hábito ou uma despesa a partir de um corpo JSON. |
| `DELETE /api/entries/<tipo>/<id>` | Exclui um registro pelo tipo (`atividade`, `leitura`, `estudos`, `sono`, `alimentacao` ou `financeiro`) e identificador numérico. |

Para hábitos, o JSON de criação usa `kind`, `date`, `value` e, opcionalmente, `note`. Para despesas, use `kind: "financeiro"`, `date`, `value`, `category` (`necessidade`, `desejo` ou `investimento`), `description` e, opcionalmente, `note`. Valores devem ser positivos; anotações aceitam até 500 caracteres e descrições financeiras até 120.

As rotas de escrita dependem do MySQL e respondem com erro `503` se o banco não estiver acessível. A interface contorna essa indisponibilidade mantendo novos registros localmente.

## Testes

Execute os testes automatizados da API no PowerShell:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Os testes usam conexões simuladas para verificar rotas, validações, gravação e remoção sem exigir um servidor MySQL ativo.

## Segurança e escopo

Esta versão é destinada ao uso pessoal e não implementa login, autorização, proteção para múltiplos usuários ou sincronização remota. O servidor inicia em `127.0.0.1`, ficando acessível apenas neste computador. Não o exponha à internet nem a uma rede compartilhada sem implementar as proteções necessárias.

Não publique credenciais reais. `.env` é ignorado pelo Git; mantenha apenas valores fictícios em `.env.example`. Os registros locais do navegador não são criptografados pelo app.