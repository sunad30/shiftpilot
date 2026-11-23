import { DatabaseSync } from "node:sqlite";
import { seed } from "../shared/seed";
import type { State } from "../shared/types";
// Atomic single-workspace snapshot. Deliberately small; see architecture notes for PostgreSQL migration.
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)",
    );
    this.db
      .prepare("INSERT OR IGNORE INTO workspace VALUES (1,?)")
      .run(JSON.stringify(seed()));
  }
  read(): State {
    return JSON.parse(
      (
        this.db.prepare("SELECT payload FROM workspace WHERE id=1").get() as {
          payload: string;
        }
      ).payload,
    );
  }
  transact(change: (state: State) => State): State {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const next = change(this.read());
      this.db
        .prepare("UPDATE workspace SET payload=? WHERE id=1")
        .run(JSON.stringify(next));
      this.db.exec("COMMIT");
      return next;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
