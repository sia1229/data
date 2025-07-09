'use strict';
const express = require('express');
const mysql    = require('mysql2');
const bodyParser = require('body-parser');
const cors       = require('cors');
const path       = require('path');

const PORT = process.env.PORT || 3000;
const app  = express();

/* ────────── Middleware ────────── */
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

/* ────────── MySQL connection ────────── */
const db = mysql.createConnection({
  host    : process.env.DB_HOST     || '127.0.0.1',
  user    : process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME     || 'credential'
});

db.connect(err => {
  if (err) {
    console.error('❌ MySQL connection error:', err);
  } else {
    console.log('✅ Connected to MySQL');
  }
});

/* ────────── Routes ────────── */
app.get('/', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

app.get('/api/contacts', (_, res) => {
  const sql = `
    SELECT No, ProjectName, Industry, Therapy, ProjectYear, Pax,
           DestinationCountry, DestinationCity, ProjectType
    FROM contacts`;
  db.query(sql, (err, rows) =>
    err ? res.status(500).json({ error: 'DB error' }) : res.json(rows)
  );
});

app.post('/api/contacts/search', (req, res) => {
  const { destinationCity, keywords, destinationCountry,
          therapy, projectYear, paxRanges } = req.body;

  let sql = `
    SELECT No, ProjectName, Industry, Therapy, ProjectYear, Pax,
           DestinationCountry, DestinationCity, ProjectType
    FROM contacts WHERE 1=1`;
  const params = [];

  if (destinationCity)   { sql += ' AND DestinationCity = ?';   params.push(destinationCity); }
  if (keywords)          { sql += ' AND LOWER(ProjectName) LIKE ?'; params.push('%'+keywords.toLowerCase()+'%'); }
  if (destinationCountry){ sql += ' AND DestinationCountry = ?'; params.push(destinationCountry); }
  if (therapy)           { sql += ' AND Therapy = ?';            params.push(therapy); }
  if (projectYear)       { sql += ' AND ProjectYear = ?';        params.push(projectYear); }
  if (Array.isArray(paxRanges) && paxRanges.length) {
      const conds = paxRanges.map(r=>{
        const [min,max] = r==='5000+' ? [5000,9999999] : r.split('-').map(Number);
        return `(Pax BETWEEN ${min} AND ${max})`;
      }).join(' OR ');
      sql += ` AND (${conds})`;
  }

  db.query(sql, params, (err, rows)=>
    err ? res.status(500).json({ error: 'DB error' }) : res.json(rows)
  );
});

/* ────────── Start server ────────── */
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
