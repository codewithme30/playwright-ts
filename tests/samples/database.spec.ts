import { test, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';

/**
 * Sample database-layer tests using Node's built-in SQLite engine (node:sqlite).
 * SQLite is a real, production-grade relational database (not a mock), and running
 * it in-memory keeps these tests deterministic and network-free, unlike a shared
 * "demo" server database that random hosts generally cannot reach or write to.
 */
function seedDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');

  db.exec(`
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    );

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      item TEXT NOT NULL,
      amount REAL NOT NULL
    );
  `);

  const insertCustomer = db.prepare('INSERT INTO customers (id, name, email) VALUES (?, ?, ?)');
  insertCustomer.run(1, 'Ada Lovelace', 'ada@example.com');
  insertCustomer.run(2, 'Alan Turing', 'alan@example.com');

  const insertOrder = db.prepare('INSERT INTO orders (id, customer_id, item, amount) VALUES (?, ?, ?, ?)');
  insertOrder.run(1, 1, 'Mechanical Calculator', 120.5);
  insertOrder.run(2, 1, 'Punch Cards', 15.0);
  insertOrder.run(3, 2, 'Enigma Decoder', 999.99);

  return db;
}

test.describe('Sample database layer tests (SQLite)', () => {
  test('seeded tables contain the expected row counts', async () => {
    const db = seedDatabase();

    const customerCount = db.prepare('SELECT COUNT(*) AS count FROM customers').get() as { count: number };
    const orderCount = db.prepare('SELECT COUNT(*) AS count FROM orders').get() as { count: number };

    expect(customerCount.count).toBe(2);
    expect(orderCount.count).toBe(3);

    db.close();
  });

  test("a join query aggregates each customer's total spend correctly", async () => {
    const db = seedDatabase();

    const rows = db
      .prepare(
        `SELECT c.name, SUM(o.amount) AS total_spent
         FROM customers c
         JOIN orders o ON o.customer_id = c.id
         GROUP BY c.id
         ORDER BY total_spent DESC`
      )
      .all() as { name: string; total_spent: number }[];

    expect(rows).toEqual([
      { name: 'Alan Turing', total_spent: 999.99 },
      { name: 'Ada Lovelace', total_spent: 135.5 },
    ]);

    db.close();
  });

  test('the UNIQUE constraint rejects a duplicate customer email', async () => {
    const db = seedDatabase();

    expect(() => {
      db.prepare('INSERT INTO customers (id, name, email) VALUES (?, ?, ?)').run(3, 'Ada Clone', 'ada@example.com');
    }).toThrow(/UNIQUE constraint failed/);

    db.close();
  });

  test('a FOREIGN KEY constraint rejects an order for a non-existent customer', async () => {
    const db = seedDatabase();
    db.exec('PRAGMA foreign_keys = ON');

    expect(() => {
      db.prepare('INSERT INTO orders (id, customer_id, item, amount) VALUES (?, ?, ?, ?)').run(
        99,
        999,
        'Ghost order',
        1
      );
    }).toThrow(/FOREIGN KEY constraint failed/);

    db.close();
  });

  test('a rolled-back transaction leaves no trace of the attempted insert', async () => {
    const db = seedDatabase();

    db.exec('BEGIN TRANSACTION');
    db.prepare('INSERT INTO customers (id, name, email) VALUES (?, ?, ?)').run(4, 'Grace Hopper', 'grace@example.com');
    db.exec('ROLLBACK');

    const row = db.prepare('SELECT COUNT(*) AS count FROM customers WHERE id = 4').get() as { count: number };
    expect(row.count).toBe(0);

    db.close();
  });
});
