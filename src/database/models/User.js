const mongoose = require('mongoose');
const Int32 = mongoose.Schema.Types.Int32;

const UserSchema = new mongoose.Schema({
    userType: {
        type: String,
        enum: ['regular', 'charter'],
        required: true
    },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    imagePath: {
        type: String,
        default: "/sample_images/pfp1.png"
        // probably should have a different default pfp later
    },
    rating: Int32,
    description: String,
    lowercaseUsername: String // for sorting
});

UserSchema.pre("save", async function() {
    if (this.isModified("username")) {
        this.lowercaseUsername = this.username.toLowerCase();
    }
});

// for when sample data is inserted
UserSchema.pre("insertMany", async function(docs) {
    for (const doc of docs) {
        doc.lowercaseUsername = doc.username.toLowerCase();
    }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;