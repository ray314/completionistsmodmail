const EXPIRE = 72 // time in hours before a requested ticket expires or a resolved ticket can no longer be reopened. should probably be moved to config

const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./database/tickets.db');
db.run('CREATE TABLE IF NOT EXISTS TICKETS(ticketid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, userid TEXT NOT NULL, status INTEGER NOT NULL, type TEXT, comment TEXT, remarks TEXT, messageid TEXT, responseid TEXT, expire INTEGER)');
db.run('CREATE TABLE IF NOT EXISTS BLOCKED(userid TEXT PRIMARY KEY NOT NULL UNIQUE, expire INTEGER NOT NULL)');

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
            db.run('INSERT INTO TICKETS (userid,status,responseid,expire) VALUES(?,1,?,?)', [userid, responseid, new Date().getTime()+(72*3600000)], function(err) {
                if (err) {
                    return reject(err);
                }
                return resolve(this.lastID);
            });

        });
    },
    resetRequest: function(ticketid, userid) {
        return new Promise((resolve, reject) => {
            isOwner(ticketid, userid).then(() => {
                db.run('UPDATE TICKETS SET status=1, type=NULL, comment=NULL, remarks=NULL, messageid=NULL, responseid=NULL, expire=? WHERE ticketid=?', [new Date().getTime()+(72*3600000), ticketid], function(err) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(this.lastID);
                });
            }).catch(error => reject(error));
        });
    },
    getTicket: function(ticketid) {
        return new Promise((resolve) => {
            db.get('SELECT * FROM TICKETS WHERE ticketid=?', [ticketid], function(err, result) {
                if (result) {
                    return resolve(result);
                } else {
                    return resolve(false);
                }
            });
        });
    },
    getRequest: function(userid) {
        return new Promise((resolve) => {
            db.get('SELECT * FROM TICKETS WHERE userid=? AND status=1 OR status=3', [userid], function(err, result) {
                if (result) {
                    return resolve(result);
                } else {
                    return resolve(false);
                }
            });
        });
    },
    getMessage: function(ticketid) {
        return new Promise((resolve) => {
            db.get('SELECT ticketid id, userid user, messageid message FROM TICKETS WHERE ticketid=?', [ticketid], function(err, result) {
                if (result) {
                    return resolve(result);
                } else {
                    return resolve(false);
                }
            });
        });
    },
    setStatus: function(ticketid, userid, status) {
        return new Promise((resolve, reject) => {
            isOwner(ticketid, userid).then(() => {
                db.run('UPDATE TICKETS SET status=? WHERE ticketid=?', [status, ticketid], function(err) {
                    if (err) {
                        return reject('NO_TICKET');
                    }
                    return resolve();
                });
            }).catch(error => reject(error));
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
    setResponse: function(ticketid, userid, responseid) {
        return new Promise((resolve, reject) => {
            isOwner(ticketid, userid).then(() => {
                db.run('UPDATE TICKETS SET responseid=? WHERE ticketid=?', [responseid, ticketid], function(err) {
                    if (err) {
                        return reject('NO_TICKET');
                    }
                    return resolve();
                });
            }).catch(error => reject(error));
        });
    }, 
    setMessage: function(ticketid, messageid) {
        return new Promise((resolve, reject) => {
            isOwner(ticketid, userid).then(() => {
                db.run('UPDATE TICKETS SET responseid=? WHERE ticketid=?', [responseid, ticketid], function(err) {
                    if (err) {
                        return reject('NO_TICKET');
                    }
                    return resolve();
                });
            }).catch(error => reject(error));
        });
    }, 
    submitTicket: function(ticketid, userid, messageid) {
        return new Promise((resolve, reject) => {
            isOwner(ticketid, userid).then(() => {
                db.run('UPDATE TICKETS SET status=2, messageid=?, expire=0 WHERE ticketid=?', [messageid, ticketid], function(err) {
                    if (err) {
                        return reject('NO_TICKET');
                    }
                    return resolve();
                });
            }).catch(error => reject(error));
        });
    }, 
    resolveTicket: function(ticketid, status, responseid, remarks) {
        return new Promise((resolve, reject) => {
            db.run('UPDATE TICKETS SET status=?, remarks=?, responseid=?, expire=? WHERE ticketid=?', [status, remarks, responseid, new Date().getTime()+(72*3600000), ticketid], function(err) {
                if (err) {
                    return reject('NO_TICKET');
                }
                return resolve();
            });
        });
    },
    deleteTicket: function(ticketid) {
        return new Promise((resolve) => {
            db.run('DELETE FROM TICKETS WHERE ticketid=?', [ticketid], function(err) {
                resolve();
            });
        });
    },
    blockUser: function(userid, expire) {
        return new Promise((resolve) => {
            db.run('INSERT INTO BLOCKED (userid,expire) VALUES(?,?)', [userid, expire], function(err) {
                if (err) {
                    db.run('UPDATE BLOCKED SET expire=? WHERE userid=?', [expire,userid], function(err) {
                        if (err) {
                            return reject();
                        }
                        return resolve();
                    });
                } else {
                    return resolve();
                }
            });
        });
    },
    unblockUser: function(userid) {
        return new Promise((resolve) => {
            db.run('DELETE FROM BLOCKED WHERE ticketid=?', [ticketid], function(err) {
                resolve();
            });
        });
    }
}