const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: process.env.RDS_HOST,
  user: process.env.APP_DB_USER,
  password: process.env.APP_DB_PASS,
  database: process.env.DB_NAME
});
connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.stack);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL Database');
});
module.exports = connection;



// const mysql = require('mysql2');
// const connection = mysql.createConnection({
//   host: 'fintrack.czccaimeyk2a.ap-south-1.rds.amazonaws.com',
//   user: 'admin',
//   password: 'admin12345678',
//   database: 'fintrack_db'
// });
// connection.connect((err) => {
//   if (err) {
//     console.error('❌ Database connection failed:', err.stack);
//     return;
//   }
//   console.log('✅ Connected to MySQL Database');
// });
// module.exports = connection;
