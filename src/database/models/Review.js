const mongoose = require('mongoose');
const Int32 = mongoose.Schema.Types.Int32;

const ReviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    chartId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chart",
        required: true
    },
    body: { type: String, required: true },
    rating: { type: Number, required: true },
    ratedAccurately: { type: Boolean, required: true },
    filePath: String,
    fileType: {
        type: String,
        enum: ["image", "video"]
    },
    isEdited: { type: Boolean, default: false },
    likes: { type: Int32, default: 0 },  // in the future, maybe change to list of users that liked
    charterResponse: String
});

const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review;