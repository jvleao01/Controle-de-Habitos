import unittest
from datetime import date
from unittest.mock import patch

import mysql.connector

from app import app


class FakeCursor:
    def __init__(self):
        self.rowcount = 1
        self.lastrowid = 41
        self.queries = []

    def execute(self, query, params=None):
        self.queries.append((query, params))

    def fetchall(self):
        return [{
            "id": 2,
            "kind": "estudos",
            "entry_date": date(2026, 9, 30),
            "value": 45,
            "note": "",
            "category": None,
            "description": None,
        }]

    def close(self):
        pass


class FakeConnection:
    def __init__(self):
        self.closed = False
        self.commits = 0
        self.cursors = []

    def cursor(self, **kwargs):
        cursor = FakeCursor()
        self.cursors.append(cursor)
        return cursor

    def commit(self):
        self.commits += 1

    def close(self):
        self.closed = True


class DeleteEntryTests(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()

    def test_delete_rejects_unknown_kind_without_opening_database(self):
        connection = FakeConnection()
        with patch("app.get_connection", return_value=connection) as get_connection:
            response = self.client.delete("/api/entries/unknown/17")

        self.assertEqual(response.status_code, 400)
        get_connection.assert_not_called()
        self.assertFalse(connection.closed)

    def test_delete_valid_kind_commits_and_closes_connection(self):
        connection = FakeConnection()
        with patch("app.get_connection", return_value=connection):
            response = self.client.delete("/api/entries/estudos/17")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(connection.commits, 1)
        self.assertTrue(connection.closed)
        self.assertIn("DELETE FROM habit_entries", connection.cursors[0].queries[0][0])


class EntryApiTests(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()

    def test_health_checks_tables_and_closes_connection(self):
        connection = FakeConnection()
        with patch("app.get_connection", return_value=connection):
            response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"database": "connected"})
        self.assertEqual(len(connection.cursors[0].queries), 2)
        self.assertTrue(connection.closed)

    def test_list_entries_serializes_date_and_decimal_values(self):
        connection = FakeConnection()
        with patch("app.get_connection", return_value=connection):
            response = self.client.get("/api/entries?start=2026-01-01&end=2026-12-31")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()[0]["entry_date"], "2026-09-30")
        self.assertEqual(response.get_json()[0]["value"], 45.0)
        self.assertTrue(connection.closed)

    def test_create_habit_commits_record(self):
        connection = FakeConnection()
        with patch("app.get_connection", return_value=connection):
            response = self.client.post("/api/entries", json={
                "kind": "estudos", "date": "2026-09-30", "value": 45,
            })

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json(), {"id": 41})
        self.assertEqual(connection.commits, 1)
        self.assertIn("INSERT INTO habit_entries", connection.cursors[0].queries[0][0])
        self.assertTrue(connection.closed)

    def test_create_expense_commits_record(self):
        connection = FakeConnection()
        with patch("app.get_connection", return_value=connection):
            response = self.client.post("/api/entries", json={
                "kind": "financeiro", "date": "2026-09-30", "value": 19.99,
                "category": "investimento", "description": "Aporte",
            })

        self.assertEqual(response.status_code, 201)
        self.assertIn("INSERT INTO expenses", connection.cursors[0].queries[0][0])
        self.assertTrue(connection.closed)

    def test_invalid_entry_does_not_open_database(self):
        with patch("app.get_connection") as get_connection:
            response = self.client.post("/api/entries", json={
                "kind": "outro", "date": "2026-09-30", "value": 1,
            })

        self.assertEqual(response.status_code, 400)
        get_connection.assert_not_called()

    def test_database_error_returns_service_unavailable(self):
        with patch("app.get_connection", side_effect=mysql.connector.Error("offline")):
            response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.get_json(), {"database": "offline"})


if __name__ == "__main__":
    unittest.main()