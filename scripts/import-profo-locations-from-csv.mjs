import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

loadDotEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const csvPath = process.argv[2];

if (!supabaseUrl || !supabaseKey) {
  console.error('VITE_SUPABASE_URL en VITE_SUPABASE_PUBLISHABLE_KEY moeten ingesteld zijn.');
  process.exit(1);
}

if (!csvPath) {
  console.error('Geef een CSV-bestand mee met minstens een kolom naam of locatie.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const records = parseCsv(fs.readFileSync(csvPath, 'utf8')).map(mapLocation).filter((record) => record.naam);

let imported = 0;
let updated = 0;

for (const record of records) {
  const { data: existingRows, error: selectError } = await supabase
    .from('locaties')
    .select('id,naam')
    .ilike('naam', record.naam);

  if (selectError) {
    console.error(`Controle mislukt voor ${record.naam}: ${selectError.message}`);
    process.exitCode = 1;
    continue;
  }

  const request = existingRows?.length
    ? supabase.from('locaties').update(record).eq('id', existingRows[0].id)
    : supabase.from('locaties').insert(record);

  const { error } = await request;

  if (error) {
    console.error(`Import mislukt voor ${record.naam}: ${error.message}`);
    process.exitCode = 1;
    continue;
  }

  if (existingRows?.length) {
    updated += 1;
  } else {
    imported += 1;
  }
}

console.log(`Klaar. Nieuw: ${imported}. Bijgewerkt: ${updated}. Totaal verwerkt: ${records.length}.`);

function mapLocation(row) {
  return {
    naam: String(row.naam || row.locatie || row.gemeente || '').trim(),
    adres: String(row.adres || '').trim() || null,
    actief: toBoolean(row.actief),
  };
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function toBoolean(value) {
  if (value === '' || value === null || value === undefined) {
    return true;
  }

  return ['waar', 'true', 'ja', 'yes', '1'].includes(String(value).trim().toLowerCase());
}

function loadDotEnv() {
  if (!fs.existsSync('.env')) {
    return;
  }

  const lines = fs.readFileSync('.env', 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...rest] = trimmed.split('=');
    process.env[key] = process.env[key] || rest.join('=').trim();
  }
}
