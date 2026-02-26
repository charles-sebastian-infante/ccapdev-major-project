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
    round: (number, numDecimalPlaces) => number.toFixed(numDecimalPlaces),
    displayLikeCount: number => {
        if (number <= 999) {
            return number.toString();
        } else {
            number /= 1000;
            if (number < 10) {
                return number.toFixed(1) + "k";
            } else {
                return number.toFixed(0) + "k";
            }
        }
    }
}