const mongoose = require("mongoose");
const Chart = require("./database/models/Chart");
const User = require("./database/models/User");
const Review = require("./database/models/Review");
const argon2id = require("@node-rs/argon2");

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
        for (const user of userSampleData) {
            if (!user.password) {
                user.password = await argon2id.hash("1234");
            }
        }
        const sampleUsers = await User.insertMany(userSampleData);

        const userIds = {};
        for (const user of sampleUsers) {
            userIds[user.username] = user.id;
        }

        // this JSON file also includes each chart's reviews
        const chartSampleData = require("./database/sample_data/sample_charts.json");
        const reviewsToAdd = [];

        for (const chart of chartSampleData) {
            const reviews = chart.reviews;
            delete chart.reviews;

            let charterId = userIds[chart.charterName];
            if (!charterId) {
                // making accounts for charters not defined in the sample data
                const hashedPassword = await argon2id.hash("1234");
                const newUser = await User.create({
                    userType: "charter",
                    username: chart.charterName,
                    password: hashedPassword,
                    email: "abc@xyz.com",
                });
                userIds[chart.charterName] = newUser.id;
                charterId = newUser.id;
            }
            chart.charterId = charterId;
            delete chart.charterName;

            const chartDoc = await Chart.create(chart);

            for (const review of reviews) {
                let userId = userIds[review.user];
                if (!userId) {
                    // making accounts for users not defined in the sample data
                    const hashedPassword = await argon2id.hash("1234");
                    const newUser = await User.create({
                        userType: "user",
                        username: review.user,
                        password: hashedPassword,
                        email: "abc@xyz.com",
                    });
                    userIds[review.user] = newUser.id;
                    userId = newUser.id;
                }
                review.userId = userIds[review.user];
                delete review.user;

                const likedBy = [];
                for (const user of review.usersThatLiked) {
                    likedBy.push(userIds[user]);
                }
                review.likedBy = likedBy;
                delete review.usersThatLiked;

                review.chartId = chartDoc.id;

                reviewsToAdd.push(review);
            }
        }

        await Review.insertMany(reviewsToAdd);

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