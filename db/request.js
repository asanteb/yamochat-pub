var mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Requested = new Schema({
    id: String,
    username: String,
    name: String,
    avatar: String,
    verified: Boolean,
    description: String,
    app_access_token: String,
    twitter_access_token: String,
    twitter_access_secret: String,
    join_date: Date,
    ip_address: String,
});

var Request = mongoose.model('requests', Requested)

module.exports = Request
