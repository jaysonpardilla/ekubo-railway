  document.addEventListener("DOMContentLoaded", function () {
    var toasts = document.querySelectorAll(".toast");
    toasts.forEach(function (toast) {
      setTimeout(function () {
        var bsToast = new bootstrap.Toast(toast);
        bsToast.hide();
      }, 3000); // Hide after 3 seconds
    });
  });
