// ========================================
// auth-guard.js
// Protects pages from unauthorized access
// ========================================

(function () {

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const expirationTime = localStorage.getItem("expirationTime");

    // ==========================
    // Redirect Helper
    // ==========================
    function redirectToLogin() {

        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        localStorage.removeItem("expirationTime");

        window.location.replace("login.html");
    }

    // ==========================
    // Check Token Exists
    // ==========================
    if (!token) {
        console.warn("No token found.");
        redirectToLogin();
        return;
    }

    // ==========================
    // Check Token Expiry
    // ==========================
    if (expirationTime) {

        const expiryDate = new Date(expirationTime);
        const currentDate = new Date();

        if (currentDate >= expiryDate) {

            console.warn("Token expired.");
            alert("Your session has expired. Please login again.");

            redirectToLogin();
            return;
        }
    }

    // ==========================
    // Determine Current Page
    // ==========================
    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

    // ==========================
    // Admin Page Protection
    // ==========================
    if (
        currentPage === "administrator.html"
        && role !== "ADMIN"
    ) {

        alert("Access denied.");

        if (role === "RECEPTIONIST") {
            window.location.replace("receptionist.html");
        } else {
            redirectToLogin();
        }

        return;
    }

    // ==========================
    // Receptionist Protection
    // ==========================
    if (
        ["index.html", "receptionist.html", "visitor.html", "checkout.html"].includes(currentPage)
        && role !== "RECEPTIONIST"
    ) {

        alert("Access denied.");

        if (role === "ADMIN") {
            window.location.replace("administrator.html");
        } else {
            redirectToLogin();
        }

        return;
    }

    console.log("Auth guard passed.");

})();