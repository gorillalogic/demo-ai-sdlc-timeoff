let lastToken = null;

const form = document.getElementById("login-form");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  let response;
  try {
    response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    message.textContent = "Could not reach the server.";
    return;
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    message.textContent = "Could not reach the server.";
    return;
  }

  if (!response.ok) {
    message.textContent = data.error ?? "Login failed.";
    return;
  }

  lastToken = data.token;
  message.textContent = "Logged in. Token issued.";
});
