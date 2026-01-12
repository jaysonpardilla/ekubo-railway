$(document).ready(function () {
    $("#interactive-form").on("submit", function () {
        $("#submit-btn").text("Submitting...").addClass("btn-loading");
    });
});