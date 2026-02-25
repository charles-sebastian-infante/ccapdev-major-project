const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId

const ChartSchema = new mongoose.Schema({
    _id: ObjectId,
    songName: String,
    songAuthor: String,
    charterName: String, // replace with charterId later
    numericRating: Number,
    difficultyLevel: {
        type: String,
        enum: ['Expert', 'Master', 'Re:Master']
    },
    imagePath: String,
    url: String
});

const Chart = mongoose.model('Chart', ChartSchema);

module.exports = Chart;