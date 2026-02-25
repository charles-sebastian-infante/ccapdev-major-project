const mongoose = require("mongoose");
const Chart = require("./database/models/Chart");

async function clearDb() {
    try {
        await Chart.deleteMany();
        console.log("Database has been cleared");
    } catch (error) {
        console.log("An error has occurred when clearing the database:");
        console.log(error);
    }
}

async function insertSampleData() {
    try {
        // the sample data is stored in JSON files
        const chartSampleData = require("./database/sample_data/sample_charts.json");
        
        await Chart.insertMany(chartSampleData);
        console.log("Sample data has been added");
    } catch (error) {
        console.log("An error has occurred when inserting sample data:");
        console.log(error);
    }
}

module.exports = {
    clearDb: clearDb,
    insertSampleData: insertSampleData
};