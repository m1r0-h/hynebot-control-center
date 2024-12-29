document.getElementById("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent the form from refreshing the page

    // Gather the necessary login information
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const loginData = { username, password };

    // Try to login
    try {
        const response = await fetch(`${AUTH_URL}/login/admin`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(loginData),
        });

        if (response.ok) {
            const data = await response.json();
            const token = data.accessToken;

            // Store the token
            localStorage.setItem("authToken", token);

            // Go to admin page
            window.location.href = "/admin";
        } else {
            const error = await response.json();
            document.getElementById("errorMessage").textContent = error.message || "Login failed!";
        }
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("errorMessage").textContent = "Something went wrong. Please try again later.";
    }
});
