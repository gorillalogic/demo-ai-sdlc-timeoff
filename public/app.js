// Minimal client glue for the login/logout demo flow (see design.md Assumption 1).
// Browser navigation cannot send an Authorization header, so the token is kept in
// localStorage and attached manually to the fetch("/") call that retrieves the
// role-specific home page.

async function loadHome(token) {
  const res = await fetch("/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const html = await res.text();
  document.open();
  document.write(html);
  document.close();
}

function attachLogoutHandler() {
  const logoutButton = document.getElementById("logout-button");
  if (!logoutButton) return;

  logoutButton.addEventListener("click", async () => {
    const token = localStorage.getItem("token");
    if (token) {
      await fetch("/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    localStorage.removeItem("token");
    window.location.reload();
  });
}

function attachLoginHandler() {
  const loginButton = document.getElementById("login-button");
  if (!loginButton) return;

  loginButton.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      alert("Invalid email or password");
      return;
    }

    const { token } = await res.json();
    localStorage.setItem("token", token);
    await loadHome(token);
  });
}

attachLoginHandler();
attachLogoutHandler();

const existingToken = localStorage.getItem("token");
if (existingToken && document.getElementById("login-form")) {
  loadHome(existingToken);
}
