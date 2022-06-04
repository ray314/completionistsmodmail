const EXPIRE = 72 // time in hours before a requested ticket expires or a resolved ticket can no longer be reopened. should probably be moved to config

const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./database/tickets.db');
db.run('CREATE TABLE IF NOT EXISTS TICKETS(ticketid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, userid TEXT NOT NULL, status INTEGER NOT NULL, type INTEGER, comment TEXT, remarks TEXT, messageid TEXT, responseid TEXT, expire INTEGER)');

// Checks if user owns the ticket.
function isOwner(ticketid, userid) {
    return new Promise((resolve, reject) => {
        db.get('SELECT 1 FROM TICKETS WHERE ticketid=? AND userid=?', [ticketid, userid], function(err, result) {
            if (result) {
                resolve();
            } else {
                reject('INVALID_USER');
            }
        });
    });
}

module.exports = {
    createRequest: function(userid, responseid) {
        return new Promise((resolve, reject) => {
            db.run('INSERT INTO TICKETS(userid,status,responseid,expire)', [userid, 0, responseid, new Date().getTime()+(72*3600000)], function(err) {
                if (err) {
                    return reject(err);
                }
                return resolve(this.lastID);
            });

        });
    },
    resetRequest: function(ticketid, responseid) {
        return new Promise((resolve, reject) => {
            db.run('UPDATE TICKETS SET status=0, type=NULL, comment=NULL, remarks=NULL, messageid=NULL, responseid=?, expire=? WHERE ticketid=?', [responseid, new Date().getTime()+(72*3600000), ticketid], function(err) {
                if (err) {
                    return reject(err);
                }
                return resolve(this.lastID);
            });
        });
    },
    getRequest: function(userid) {
        return new Promise((resolve, reject) => {
            db.get('SELECT ticketid id, responseid response FROM TICKETS WHERE userid=? AND status=0', [userid], function(err, result) {
                if (result) {
                    return resolve(result);
                } else {
                    return resolve(false);
                }
            });
        });
    },
    setType: function(ticketid, userid, type) {
        return new Promise((resolve, reject) => {
            isOwner(ticketid, userid).then(() => {
                db.run('UPDATE TICKETS SET type=? WHERE ticketid=?', [type, ticketid], function(err) {
                    if (err) {
                        return reject('NO_TICKET');
                    }
                    return resolve();
                });
            }).catch(error => reject(error));
        });
    }, 
    setComment: function(ticketid, userid, comment) {
        return new Promise((resolve, reject) => {
            isOwner(ticketid, userid).then(() => {
                db.run('UPDATE TICKETS SET comment=? WHERE ticketid=?', [comment, ticketid], function(err) {
                    if (err) {
                        return reject('NO_TICKET');
                    }
                    return resolve();
                });
            }).catch(error => reject(error));
        });
    }, 
    submitTicket: function(ticketid, userid, messageid, responseid) {

    }, 
    closeTicket: function() {

    },
    deleteTicket: function() { // only used if theres missing data
        db.delete();
    }
}