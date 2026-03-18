const mongoose = require('mongoose');
const Int32 = mongoose.Schema.Types.Int32;

const UserSchema = new mongoose.Schema({
    userType: {
        type: String,
        enum: ['regular', 'charter']
    },
    username: String,
    password: String,
    imagePath: {
        type: String,
        default: "/sample_images/pfp1.png"
        // probably should have a different default pfp later
    },
    rating: Int32,
    description: String
});

const User = mongoose.model('User', UserSchema);

module.exports = User;