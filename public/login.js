const form = document.querySelector("#login-form");
const user = document.querySelector("#login-user");
const password = document.querySelector("#login-password");
const error = document.querySelector("#login-error");
const submitBtn = form.querySelector('button[type="submit"]');
const toastRegion = document.querySelector("#login-toast");

function showToast(text, variant = "error") {
  if (!toastRegion) return;
  const el = document.createElement("div");
  el.className = `toast toast--${variant}`;
  el.textContent = text;
  toastRegion.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    setTimeout(() => el.remove(), 260);
  }, 4000);
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  error.textContent = "";
  submitBtn.disabled = true;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: user.value, password: password.value })
    });

    let data = {};
    try {
      const raw = await response.text();
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      error.textContent = data.error || "Usuário ou senha inválidos.";
      showToast(error.textContent, "error");
      return;
    }

    window.location.href = "/admin.html";
  } catch {
    const msg = "Não foi possível conectar. Verifique sua rede.";
    error.textContent = msg;
    showToast(msg, "error");
  } finally {
    submitBtn.disabled = false;
  }
});
