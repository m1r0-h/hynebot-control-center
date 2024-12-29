document.getElementById("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent the form from refreshing the page

    // Gather the necessary login information
    const code = document.getElementById("code").value;
    const loginData = { code };

    // Login
    try {
        const response = await fetch(`${AUTH_URL}/login`, {
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

            // Redirect to the control page
            window.location.href = "/control";
        } else {
            const error = await response.json();
            document.getElementById("errorMessage").textContent = error.message || "Login failed!";
        }
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("errorMessage").textContent = "Something went wrong. Please try again later.";
    }
});
