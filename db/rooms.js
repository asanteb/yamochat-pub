var mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Room = new Schema({
    id: String,
    name: String,
    private: Boolean,
    avatar: String,
    banner: String,
    verified: Boolean,
    description: String,
    owner: String,
    mods: Array,
    users: Array,
    callers: Array,
    views: Number,
    date_created: Date,
    comments: Array,
    hostPresent: Boolean,
    viewers: Array
})

var PlayerModel = mongoose.model('rooms', Room)

module.exports = PlayerModel
