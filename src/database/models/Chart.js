const mongoose = require('mongoose');

const ChartSchema = new mongoose.Schema({
    songName: String,
    songAuthor: String,
    charterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    numericRating: Number,
    difficultyLevel: {
        type: String,
        enum: ['Expert', 'Master', 'Re:Master']
    },
    imagePath: String
});

const Chart = mongoose.model('Chart', ChartSchema);

module.exports = Chart;