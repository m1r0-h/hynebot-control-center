const token = localStorage.getItem("authToken");

// Notify user about token expiration
const tokenParts = token.split(".");// Split the token (header, payload, signature)
const payload = JSON.parse(atob(tokenParts[1]));// Decode the payload (atob() = decode Base64)
const currentTime = Math.floor(Date.now() / 1000);// Get the current time in milliseconds

// Check if the token is already expired
if (payload.exp < currentTime) {
    alert("Your token has already expired. Please login again.");
} else {
    const timeLeft = (payload.exp - currentTime) * 1000;// Calculate the remaining time
    const warningTime = 60 * 1000;
    setTimeout(() => {
        alert("Your token will expire in 1 minute.");
    }, timeLeft - warningTime);
    setTimeout(() => {
        alert("Token has expired. Please login again.");
    }, timeLeft);
}


// Left side - Make new login code 
document.getElementById("new-code-form").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent the form from refreshing the page

    // Gather the necessary data
    const code = document.getElementById("code").value;
    const id = document.getElementById("id").value;
    const startsAtElement = document.getElementById("startsAt");
    const expiresAtElement = document.getElementById("expiresAt");
    const startsAt = new Date(startsAtElement.value).toISOString();
    const expiresAt = new Date(expiresAtElement.value).toISOString();
    const loginData = { code, id, startsAt, expiresAt };

    // Send new code to the auth server
    try {
        const response = await fetch(`${AUTH_URL}/code`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(loginData),
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById("successMessage").textContent = data.message;
            document.getElementById("errorMessageLeft").textContent = "";
        } else {
            const error = await response.json();
            document.getElementById("successMessage").textContent = "";
            document.getElementById("errorMessageLeft").textContent = error.message || "New code creation failed!";
        }
    } catch (error) {
        document.getElementById("errorMessageLeft").textContent = "Something went wrong. Please try again later.";
    }
});



// Right side - Make new bot token
document.getElementById("bot-token-form").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent the form from refreshing the page

    // Gather the necessary data
    const botId = document.getElementById("botId").value;
    const loginData = { id: botId };

    // Try to get bot token
    try {
        const response = await fetch(`${AUTH_URL}/bot/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(loginData),
        });

        if (response.ok) {
            // Get token
            const data = await response.json();
            const token = data.botToken;

            // Create a Blob with the token
            const blob = new Blob([token], { type: "text/plain" });

            // Donwload file
            const link = document.createElement("a"); // Create link
            link.href = window.URL.createObjectURL(blob); // Point link to file
            link.download = "bot_token.txt"; // Make the link to download the file
            document.body.appendChild(link);
            link.click(); // Donwload
            document.body.removeChild(link); // Remove link
        } else {
            const error = await response.json();
            document.getElementById("errorMessageRight").textContent = error.message || "Failed to make new token!";
        }
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("errorMessage").textContent = "Something went wrong. Please try again later.";
    }
});
