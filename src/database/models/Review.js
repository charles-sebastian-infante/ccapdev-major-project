const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');

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
    createdAt: { type: Date, default: Date.now },
    editedAt: Date,
    likedBy: [{ // array of users that liked
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    charterResponse: String,
    responseCreatedAt: Date,
    responseEditedAt: Date
});

// number of likes is a virtual
ReviewSchema.virtual("likes").get(function() {
    return this.likedBy.length;
});

// for number of likes to be included even when doing a lean query
ReviewSchema.plugin(mongooseLeanVirtuals);

const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review;