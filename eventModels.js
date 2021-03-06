const database = require('./db');

//Hämta en Bok
const readNewbook = (id) => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT * FROM books 
                    WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[payment_id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};

//Lägg till Bok
const createNewbook = (mmsid, recordid, isbn, isbnprimo, thumbnail, coverurl, 
    title, activationdate, publicationdate, dewey, subject, category, subcategory, booktype) => {
    return new Promise(function (resolve, reject) {
        const sql = `INSERT INTO books(mmsid, recordid, isbn, isbnprimo, thumbnail, coverurl, 
            title, activationdate, publicationdate, dewey, subject, category, subcategory, booktype)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        database.db.query(database.mysql.format(sql,[mmsid, recordid, isbn, isbnprimo, thumbnail, coverurl, 
            title, activationdate, publicationdate, dewey, subject, category, subcategory, booktype]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The Book was successfully created."
            resolve(successMessage);
        });
    })
};

//Uppdatera Bok
const updateNewbook = (id, title) => {
    return new Promise(function (resolve, reject) {
        const sql = `UPDATE books
                    SET title = ?
                    WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[title, id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The book was successfully updated."
            resolve(successMessage);
        });
    })
};

//Ta bort en Bok
const deleteNewbook = (id) => {
    return new Promise(function (resolve, reject) {
        const sql = `DELETE FROM books
                    WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The book was successfully deleted."
            resolve(successMessage);
        });
    })
};

//Hämta alla böcker från och med aktiveringsdatum
const readNewbooks = (req) => {

    //Bygg SQL utifrån parametrar
    let sql = `SELECT id, mmsid, recordid, isbn, isbnprimo, thumbnail, coverurl, 
                    title, DATE_FORMAT(activationdate, "%Y-%m-%d") as activationdate, 
                    publicationdate, dewey, subject, category, subcategory, booktype 
                    FROM books
                    WHERE 1`;

    if(req.query.activationdate) {
        sql += ` AND activationdate >= '${req.query.activationdate}'`
    }

    if(req.query.publicationdate) {
        sql += ` AND  cast(publicationdate AS SIGNED) >= ${req.query.publicationdate}`
    }

    if(req.query.booktype) {
        sql += ` AND booktype = '${req.query.booktype}'`
    }

    if(req.query.dewey) {
        if (req.query.dewey.length == 1) {
            sql += ` AND (dewey LIKE '${req.query.dewey}__.%' OR dewey LIKE '${req.query.dewey}__/%')`
        }
        if (req.query.dewey.length == 2) {
            sql += ` AND (dewey LIKE '${req.query.dewey}_.%' OR dewey LIKE '${req.query.dewey}_/%')`
        }
        if (req.query.dewey.length == 3) {
            sql += ` AND (dewey LIKE '${req.query.dewey}.%' OR dewey LIKE '${req.query.dewey}/%')`
        }
        
    }

    sql += ` ORDER BY activationdate DESC`;

    return new Promise(function (resolve, reject) {
        
        database.db.query(database.mysql.format(sql),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};

module.exports = {
    readNewbook,
    createNewbook,
    updateNewbook,
    deleteNewbook,
    readNewbooks
}