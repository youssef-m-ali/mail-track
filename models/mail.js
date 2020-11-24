const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mailSchema = new Schema({
    id: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        reuired: false
    },
    to: {
        type: String,
        required: false
    },
    readat: {
        type: [String],
        reuired:false
    }
});

const Mail = mongoose.model('Mail', mailSchema);

module.exports = Mail;
