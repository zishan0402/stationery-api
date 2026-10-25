const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");
const loginButton = document.getElementById("loginButton");

loginForm.addEventListener("submit", async (event) => {
  // Stop the browser from reloading the page
  event.preventDefault();

  // Clear any previous error
  errorMessage.textContent = "";

  // Read the form values
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Prevent duplicate submissions while logging in
  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    // Handle unsuccessful login
    if (!response.ok || !result.success || !result.token) {
      errorMessage.textContent =
        result.message || "Login failed. Please check your credentials.";
      return;
    }

    // Keep the token for this browser tab's session
    sessionStorage.setItem("token", result.token);
    sessionStorage.setItem("user", JSON.stringify(result.data));

    // Navigate to the dashboard
    window.location.href = "/dashboard.html";
  } catch (error) {
    console.error("Login request failed:", error);
    errorMessage.textContent =
      "Unable to connect to the server. Please try again.";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign in";
  }
});
