import os
import threading
import webbrowser
from contextlib import contextmanager
from datetime import date

import mysql.connector
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from mysql.connector import Error

load_dotenv()

app = Flask(__name__)


def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "habitflow"),
        connection_timeout=int(os.getenv("DB_CONNECT_TIMEOUT", "5")),
    )


@contextmanager
def database_cursor(dictionary=False):
    connection = get_connection()
    try:
        cursor = connection.cursor(dictionary=dictionary)
        try:
            yield connection, cursor
        finally:
            cursor.close()
    finally:
        connection.close()


def parse_date(value):
    return date.fromisoformat(value)


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/health")
def health():
    try:
        with database_cursor() as (_, cursor):
            cursor.execute("SELECT 1 FROM habit_entries LIMIT 0")
            cursor.execute("SELECT 1 FROM expenses LIMIT 0")
        return jsonify({"database": "connected"})
    except Error:
        return jsonify({"database": "offline"}), 503


@app.get("/api/entries")
def list_entries():
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        parse_date(start)
        parse_date(end)
        with database_cursor(dictionary=True) as (_, cursor):
            cursor.execute(
                """SELECT id, habit AS kind, logged_on AS entry_date, amount AS value,
                          note, NULL AS category, NULL AS description
                   FROM habit_entries WHERE logged_on BETWEEN %s AND %s
                   UNION ALL
                   SELECT id, 'financeiro' AS kind, spent_on AS entry_date, amount AS value,
                          note, category, description
                   FROM expenses WHERE spent_on BETWEEN %s AND %s
                   ORDER BY entry_date DESC, id DESC""",
                (start, end, start, end),
            )
            entries = cursor.fetchall()
        for entry in entries:
            entry["entry_date"] = entry["entry_date"].isoformat()
            entry["value"] = float(entry["value"])
        return jsonify(entries)
    except (ValueError, TypeError):
        return jsonify({"error": "Informe um intervalo de datas válido."}), 400
    except Error:
        return jsonify({"error": "Não foi possível conectar ao MySQL."}), 503


@app.post("/api/entries")
def create_entry():
    payload = request.get_json(silent=True) or {}
    kind = payload.get("kind")
    try:
        entry_date = parse_date(payload.get("date", ""))
        value = float(payload.get("value", 0))
        if value <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Data ou valor inválido."}), 400

    if kind == "financeiro":
        category = payload.get("category")
        if category not in {"necessidade", "desejo", "investimento"}:
            return jsonify({"error": "Categoria financeira inválida."}), 400
    elif kind not in {"atividade", "leitura", "estudos", "sono", "alimentacao"}:
        return jsonify({"error": "Hábito inválido."}), 400

    try:
        with database_cursor() as (connection, cursor):
            if kind == "financeiro":
                cursor.execute(
                    "INSERT INTO expenses (spent_on, description, amount, category, note) VALUES (%s, %s, %s, %s, %s)",
                    (entry_date, payload.get("description", "Gasto")[:120], value, category, payload.get("note", "")[:500]),
                )
            else:
                cursor.execute(
                    "INSERT INTO habit_entries (habit, logged_on, amount, note) VALUES (%s, %s, %s, %s)",
                    (kind, entry_date, value, payload.get("note", "")[:500]),
                )
            connection.commit()
            entry_id = cursor.lastrowid
        return jsonify({"id": entry_id}), 201
    except Error:
        return jsonify({"error": "Não foi possível salvar no MySQL."}), 503


@app.delete("/api/entries/<kind>/<int:entry_id>")
def delete_entry(kind, entry_id):
    if kind not in {"financeiro", "atividade", "leitura", "estudos", "sono", "alimentacao"}:
        return jsonify({"error": "Tipo de registro inválido."}), 400
    table = "expenses" if kind == "financeiro" else "habit_entries"
    try:
        with database_cursor() as (connection, cursor):
            cursor.execute(f"DELETE FROM {table} WHERE id = %s", (entry_id,))
            connection.commit()
            deleted = cursor.rowcount > 0
        return ("", 204) if deleted else (jsonify({"error": "Registro não encontrado."}), 404)
    except Error:
        return jsonify({"error": "Não foi possível remover do MySQL."}), 503


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    if os.getenv("OPEN_BROWSER") == "1":
        threading.Timer(1.5, lambda: webbrowser.open(f"http://127.0.0.1:{port}")).start()
    app.run(host=host, debug=os.getenv("FLASK_DEBUG", "0") == "1", port=port)