const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_aAXHf6YeI3OD@ep-orange-darkness-a4vv71p4-pooler.us-east-1.aws.neon.tech/neondb?',
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => { console.log('SUCCESS'); client.end(); })
  .catch(err => { 
    console.log('ERROR IS ERROR INSTANCE?', err instanceof Error);
    console.log('ERROR TYPE:', typeof err);
    console.log('KEYS:', Object.keys(err));
    console.log('ERROR MESSAGE:', err.message); 
    console.log('RAW JSON:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    client.end(); 
  });
