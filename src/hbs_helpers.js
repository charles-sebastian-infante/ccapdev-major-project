// note: dl stands for difficulty level
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const marked = require('marked');

function formatDate(date) {
    date = date.toISOString();
    return `${date.slice(5, 7)}/${date.slice(8, 10)}/${date.slice(0, 4)}`;
}

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
    },
    isFalse: expression => (expression === false),
    displayAdditionalReviewInfo: (isEdited, filePath, fileType) => {
        let editedInfo = "";
        let fileInfo = "";

        if (isEdited) {
            editedInfo = "(edited)";
        }

        if (filePath) {
            fileInfo = `(${fileType} attached)`;
        }

        if (editedInfo && fileInfo) {
            return editedInfo + " " + fileInfo;
        }

        if (editedInfo) {
            return editedInfo;
        }

        return fileInfo;
    },
    displayAdditionalResponseInfo: (responseEditedAt) => {
        if (!responseEditedAt) {
            return "";
        }
        return `(edited ${formatDate(responseEditedAt)})`;
    },
    formatDate: formatDate,
    isCharter: (userType) => (userType === "charter"),
    renderMarkdown: (markdownString) => DOMPurify.sanitize(marked.parse(markdownString, { mangle: false, headerIds: false })),
    // Safely rendering markdown using marked to turn it into HTML and DOMPurify to sanitize dangerous tags
}