// note: dl stands for difficulty level

module.exports = {
    dlToShortName: dl => {
        switch (dl) {
            case "Expert":
                return "exp";
            case "Master":
                return "mas";
            case "Re:Master":
                return "remas";
            default:
                return "";
        }
    },
    dlToLongName: dl => {
        switch (dl) {
            case "Expert":
                return "expert";
            case "Master":
                return "master";
            case "Re:Master":
                return "remaster";
            default:
                return "";
        }
    },
    round: (number, numDecimalPlaces) => number.toFixed(numDecimalPlaces)
}