from getpass import getpass
from pathlib import Path
import secrets

import mysql.connector
from mysql.connector import Error

PROJECT_DIR = Path(__file__).resolve().parent
ENV_FILE = PROJECT_DIR / ".env"
SCHEMA_FILE = PROJECT_DIR / "schema.sql"
APP_USER = "habitflow_app"
APP_HOST = "127.0.0.1"


def configure_mysql():
    if ENV_FILE.exists():
        print("O arquivo .env já existe; nenhuma configuração foi alterada.")
        return 0

    admin_password = getpass("Senha administrativa do MySQL (entrada oculta): ")
    app_password = secrets.token_hex(32)
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(
            host="127.0.0.1",
            port=3306,
            user="root",
            password=admin_password,
            connection_timeout=5,
        )
        cursor = connection.cursor()
        for statement in SCHEMA_FILE.read_text(encoding="utf-8").split(";"):
            statement = statement.strip()
            if statement:
                cursor.execute(statement)

        user_sql = f"'{APP_USER}'@'{APP_HOST}'"
        cursor.execute(f"CREATE USER IF NOT EXISTS {user_sql} IDENTIFIED BY '{app_password}'")
        cursor.execute(f"ALTER USER {user_sql} IDENTIFIED BY '{app_password}'")
        cursor.execute(f"GRANT SELECT, INSERT, DELETE ON habitflow.* TO {user_sql}")

        env_contents = (
            "DB_HOST=127.0.0.1\n"
            "DB_PORT=3306\n"
            f"DB_USER={APP_USER}\n"
            f"DB_PASSWORD={app_password}\n"
            "DB_NAME=habitflow\n"
            "DB_CONNECT_TIMEOUT=5\n"
            "PORT=5000\n"
        )
        with ENV_FILE.open("x", encoding="utf-8") as env_file:
            env_file.write(env_contents)

        print("MySQL configurado; banco, tabelas e usuário da aplicação criados.")
        print("A senha da aplicação foi gravada somente no arquivo local .env.")
        return 0
    except Error as error:
        print(f"Não foi possível configurar o MySQL (código {error.errno}).")
        print("Confirme a senha administrativa e tente novamente.")
        return 1
    except OSError:
        print("Não foi possível ler schema.sql ou gravar o arquivo local .env.")
        return 1
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


if __name__ == "__main__":
    raise SystemExit(configure_mysql())