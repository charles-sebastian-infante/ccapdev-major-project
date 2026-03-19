const mongoose = require('mongoose');
const Int32 = mongoose.Schema.Types.Int32;

const ReviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    chartId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chart"
    },
    body: String,
    rating: Number,
    ratedAccurately: Boolean,
    filePath: String,
    fileType: {
        type: String,
        enum: ["image", "video"]
    },
    isEdited: Boolean,
    likes: Int32,   // in the future, maybe change to list of users
                    // that liked
    charterResponse: String
});

const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review;