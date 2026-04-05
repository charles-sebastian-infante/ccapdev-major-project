const mongoose = require('mongoose');

const ChartSchema = new mongoose.Schema({
    songName: { type: String, required: true },
    songAuthor: { type: String, required: true },
    charterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    numericRating: { type: Number, required: true },
    difficultyLevel: {
        type: String,
        enum: ['Expert', 'Master', 'Re:Master'],
        required: true
    },
    imagePath: { type: String, required: true },
    lowercaseSongName: String // for sorting
});

ChartSchema.pre("save", async function() {
    if (this.isModified("songName")) {
        this.lowercaseSongName = this.songName.toLowerCase();
    }
});

// for when sample data is inserted
ChartSchema.pre("insertMany", async function(docs) {
    for (const doc of docs) {
        doc.lowercaseSongName = doc.songName.toLowerCase();
    }
});

const Chart = mongoose.model('Chart', ChartSchema);

module.exports = Chart;