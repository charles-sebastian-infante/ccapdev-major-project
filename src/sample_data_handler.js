const mongoose = require("mongoose");
const Chart = require("./database/models/Chart");
const User = require("./database/models/User");
const Review = require("./database/models/Review");

async function clearDb() {
    try {
        await Chart.deleteMany();
        await User.deleteMany();
        await Review.deleteMany();
        console.log("Database has been cleared");
    } catch (error) {
        console.log("An error has occurred when clearing the database:");
        console.log(error);
    }
}

async function insertSampleData() {
    try {
        // the sample data is stored in JSON files
        const userSampleData = require("./database/sample_data/sample_users.json");
        const sampleUsers = await User.insertMany(userSampleData);

        const userIds = {
            "pieisspy": sampleUsers[0].id,
            "malding_maimai": sampleUsers[1].id,
            "tarosushiramen": sampleUsers[2].id,
            "teslacia": sampleUsers[3].id,
            "pro_baiter": sampleUsers[4].id,
            "SEGA": sampleUsers[5].id,
            "すきやき奉行": sampleUsers[6].id,
            "小鳥遊さん": sampleUsers[7].id
        };

        const chartSampleData = require("./database/sample_data/sample_charts.json");

        // binding each chart to the charter that posted it
        chartSampleData[0].charterId = userIds["SEGA"];
        chartSampleData[1].charterId = userIds["SEGA"];
        chartSampleData[2].charterId = userIds["SEGA"];
        chartSampleData[3].charterId = userIds["すきやき奉行"];
        chartSampleData[4].charterId = userIds["小鳥遊さん"];

        const sampleCharts = await Chart.insertMany(chartSampleData);

        const chartIds = {
            "sample_exp": sampleCharts[0].id,
            "sample_mas": sampleCharts[1].id,
            "sample_remas": sampleCharts[2].id,
            "emperror_exp": sampleCharts[3].id,
            "emperror_mas": sampleCharts[4].id
        };

        const reviewSampleData = require("./database/sample_data/sample_reviews.json");

        // binding each review to the user that posted it and the chart it is posted on

        // "nice chart, banger"
        reviewSampleData[0].userId = userIds["pieisspy"];
        reviewSampleData[0].chartId = chartIds["sample_exp"];
        // "chart is quite difficult for a 13.7 ..."
        reviewSampleData[1].userId = userIds["malding_maimai"];
        reviewSampleData[1].chartId = chartIds["sample_remas"];
        // "pretty easy malding just has skill issue"
        reviewSampleData[2].userId = userIds["tarosushiramen"];
        reviewSampleData[2].chartId = chartIds["sample_remas"];
        // "fun except the end lol, that superlong trill was insane"
        reviewSampleData[3].userId = userIds["teslacia"];
        reviewSampleData[3].chartId = chartIds["emperror_exp"];
        // "free if you just lock in lol"
        reviewSampleData[4].userId = userIds["pro_baiter"];
        reviewSampleData[4].chartId = chartIds["emperror_mas"];

        await Review.insertMany(reviewSampleData);

        console.log("Sample data has been added");
    } catch (error) {
        console.log("An error has occurred when inserting sample data:");
        console.log(error);
    }
}

async function resetDatabase() {
    try {
        await clearDb();
        await insertSampleData();
    } catch (error) {
        console.log("An error has occured when resetting the database:");
        console.log(error);
    }
}

module.exports = {
    clearDb: clearDb,
    insertSampleData: insertSampleData,
    resetDatabase: resetDatabase
};