const mongoose = require('mongoose');
const Int32 = mongoose.Schema.Types.Int32;

const UserSchema = new mongoose.Schema({
    userType: {
        type: String,
        enum: ['regular', 'charter']
    },
    username: String,
    password: String, // hash this later
    email: String, // encrypt this later (?)
    imagePath: String,
    rating: Int32,
    description: String
});

const User = mongoose.model('User', UserSchema);

module.exports = User;