require('dotenv').config()

const mysql = require('mysql');

const db = mysql.createPool({
    connectionLimit: 100,
    host: process.env.DATABASE_SERVER,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    debug: false
});

module.exports = { db, mysql }