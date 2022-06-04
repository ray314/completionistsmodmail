const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/tickets.db');
const EXPIRE = 72 // time in hours before a requested ticket expires or a resolved ticket can no longer be reopened.
// create table

// Checks if user owns the ticket
function isOwner(ticketid, userid) {

}

module.exports = {
    createRequest: function(userid, responseid) {

    }, 
    setType: function(ticketid, userid, type) {

    }, 
    setComment: function(ticketid, userid, type) {

    }, 
    submitTicket: function(ticketid, userid, messageid, responseid) {

    }, 
    closeTicket: function() {

    },
    deleteTicket: function() { // only used if theres missing data

    }
}