const { ConnectionStringParser } = require('./dist/common/utils/connection-string-parser');
try {
  console.log(ConnectionStringParser.parse("postgresql://neondb_owner:npg_mZrHi4zISuU6@ep-lucky-pond-ann044cv-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"));
} catch(e) {
  console.log("ERROR:", e.message);
}
