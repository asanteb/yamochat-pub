var mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Whitelisted = new Schema({
    id: String,
    username: String,
    ip_address: String
});

var Whitelist = mongoose.model('whitelist', Whitelisted)

module.exports = Whitelist
