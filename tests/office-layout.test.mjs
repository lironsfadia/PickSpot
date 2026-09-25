import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';

// Exercise the actual seeder against an isolated SQLite database.
const source = readFileSync(new URL('../lib/office.js', import.meta.url), 'utf8')
  .replace('import database from "./db";', '').replaceAll('export function', 'function');
function fixture() {
  const database = new DatabaseSync(':memory:');
  database.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE sites(id INTEGER PRIMARY KEY,name TEXT,map_path TEXT);
    CREATE TABLE seats(id INTEGER PRIMARY KEY,site_id INTEGER,label TEXT,zone TEXT,x REAL,y REAL,active INTEGER DEFAULT 1,UNIQUE(site_id,label));
    CREATE TABLE bookings(id INTEGER PRIMARY KEY,seat_id INTEGER REFERENCES seats(id));
    CREATE TABLE seat_blocks(id INTEGER PRIMARY KEY,seat_id INTEGER REFERENCES seats(id));`);
  const context = vm.createContext({ database });
  vm.runInContext(source, context);
  return { database, seed: () => vm.runInContext('seedOffice()', context) };
}

test('audited desk inventory has unique valid positions and regional counts', () => {
  const { database: db, seed } = fixture();
  try {
    seed();
    const seats = db.prepare('SELECT * FROM seats WHERE active=1').all();
    assert.equal(seats.length,108);
    assert.equal(seats.filter(s=>s.zone==='Blue').length,47);
    assert.equal(seats.filter(s=>s.zone==='Green' && s.x>80).length,42);
    assert.equal(seats.filter(s=>s.zone==='Green' && s.x<30).length,12);
    assert.equal(seats.filter(s=>s.zone==='Yellow').length,7);
    assert.equal(new Set(seats.map(s=>`${s.x},${s.y}`)).size,seats.length);
    assert.ok(seats.every(s=>s.x>0 && s.x<100 && s.y>0 && s.y<100));
  } finally { db.close(); }
});

test('retiring non-chair positions preserves IDs, history and existing blocks', () => {
  const { database: db, seed } = fixture();
  try {
    seed();
    const omitted=['B-01','B-07','B-20','B-37','B-51','G-18','G-33','G-36'];
    const insert=db.prepare('INSERT INTO seats(site_id,label,zone,x,y) VALUES(1,?,?,10,10)');
    for (const label of omitted) insert.run(label,label.startsWith('B')?'Blue':'Green');
    const id=db.prepare("SELECT id FROM seats WHERE label='B-01'").get().id;
    db.prepare('INSERT INTO bookings VALUES(1,?)').run(id);
    db.prepare('INSERT INTO seat_blocks VALUES(1,?)').run(id);
    const before=db.prepare('SELECT id,label FROM seats ORDER BY id').all();
    seed(); seed();
    assert.deepEqual(db.prepare('SELECT id,label FROM seats ORDER BY id').all(),before);
    assert.equal(db.prepare('SELECT count(*) n FROM seats WHERE active=1').get().n,108);
    for (const label of omitted) assert.equal(db.prepare('SELECT active FROM seats WHERE label=?').get(label).active,0);
    assert.equal(db.prepare('SELECT seat_id FROM bookings').get().seat_id,id);
    assert.equal(db.prepare('SELECT seat_id FROM seat_blocks').get().seat_id,id);
  } finally { db.close(); }
});
